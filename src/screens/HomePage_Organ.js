import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  FlatList,
  Dimensions,
  Animated,
  Pressable,
} from 'react-native';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, onSnapshot, orderBy, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const slides = [
  { id: '1', image: require('../../assets/slide1.png') },
  { id: '2', image: require('../../assets/slide2.png') },
  { id: '3', image: require('../../assets/slide3.png') },
];

const Homepage_Organ = ({ user, navigation }) => {
  const [firstName, setFirstName] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [chatNotifications, setChatNotifications] = useState([]);
  const [applicationNotifications, setApplicationNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(280)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const mainContentScale = useRef(new Animated.Value(1)).current;
  const mainContentTranslate = useRef(new Animated.Value(0)).current;

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigation.replace('Login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const openMenu = () => {
    setIsMenuOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0.6,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(mainContentScale, {
        toValue: 0.85,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(mainContentTranslate, {
        toValue: -50,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 280,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(mainContentScale, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(mainContentTranslate, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsMenuOpen(false);
    });
  };

  const toggleMenu = () => {
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
    setIsNotificationOpen(false);
  };

  const toggleNotifications = () => {
    setIsNotificationOpen(!isNotificationOpen);
    setIsMenuOpen(false);
  };

  // האזנה להודעות צ'אט וגם לבקשות התנדבות
  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) return;
    
    const db = getFirestore();
    
    // האזנה להודעות צ'אט חדשות
    const messagesRef = collection(db, 'chatMessages');
    const chatQuery = query(
      messagesRef,
      where('receiverId', '==', currentUser.uid),
      where('read', '==', false),
      orderBy('timestamp', 'desc')
    );
    
    const chatUnsubscribe = onSnapshot(chatQuery, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUnreadMessages(newMessages.length);
      
      // ארגון ההודעות לפי שולח (מתנדב)
      const notificationsBySender = {};
      newMessages.forEach(msg => {
        if (!notificationsBySender[msg.senderId]) {
          notificationsBySender[msg.senderId] = {
            senderId: msg.senderId,
            senderName: '',
            messageCount: 0,
            lastMessage: '',
            type: 'chat'
          };
        }
        notificationsBySender[msg.senderId].messageCount++;
        if (!notificationsBySender[msg.senderId].lastMessage || 
            msg.timestamp > notificationsBySender[msg.senderId].lastMessageTime) {
          notificationsBySender[msg.senderId].lastMessage = msg.text;
          notificationsBySender[msg.senderId].lastMessageTime = msg.timestamp;
        }
      });
      
      // השגת שמות המתנדבים השולחים
      const fetchSenderNames = async () => {
        const notifications = Object.values(notificationsBySender);
        for (const notification of notifications) {
          try {
            const senderDoc = await getDoc(doc(db, 'users', notification.senderId));
            if (senderDoc.exists()) {
              const senderData = senderDoc.data();
              notification.senderName = senderData.fullName || 
                (senderData.firstName && senderData.lastName ? 
                `${senderData.firstName} ${senderData.lastName}` : 
                senderData.firstName || senderData.lastName || 'מתנדב');
            }
          } catch (error) {
            console.error('Error fetching sender name:', error);
          }
        }
        setChatNotifications(notifications);
        updateTotalNotifications();
      };
      
      if (Object.keys(notificationsBySender).length > 0) {
        fetchSenderNames();
      } else {
        setChatNotifications([]);
        updateTotalNotifications();
      }
    });
    
    // האזנה להתראות על בקשות התנדבות
    const notificationsRef = collection(db, 'notifications');
    const applicationsQuery = query(
      notificationsRef,
      where('organizerId', '==', currentUser.uid),
      where('type', '==', 'application'),
      where('read', '==', false),
      orderBy('timestamp', 'desc')
    );
    
    const applicationsUnsubscribe = onSnapshot(applicationsQuery, (snapshot) => {
      const newApplications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        type: 'application'
      }));
      
      setApplicationNotifications(newApplications);
      updateTotalNotifications();
    });
    
    return () => {
      chatUnsubscribe();
      applicationsUnsubscribe();
    };
  }, []);
  
  // עדכון סך כל ההתראות
  const updateTotalNotifications = () => {
    setTotalNotifications(unreadMessages + applicationNotifications.length);
  };

  useEffect(() => {
    updateTotalNotifications();
  }, [unreadMessages, applicationNotifications]);

  const navigateToChat = async (senderId, senderName) => {
    // סימון ההודעות כנקראות לפני המעבר לדף הצ'אט
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        const chatId = [currentUser.uid, senderId].sort().join('_');
        const db = getFirestore();
        const messagesRef = collection(db, 'chatMessages');
        
        // שאילתה שמחזירה את כל ההודעות הלא נקראות מהמתנדב הספציפי
        const q = query(
          messagesRef,
          where('chatId', '==', chatId),
          where('receiverId', '==', currentUser.uid),
          where('read', '==', false)
        );
        
        const unreadMessagesSnapshot = await getDocs(q);
        
        // עדכון כל ההודעות לסטטוס "נקראו"
        const updatePromises = unreadMessagesSnapshot.docs.map(doc => 
          updateDoc(doc.ref, { read: true })
        );
        
        // המתנה לסיום העדכונים
        await Promise.all(updatePromises);
        
        // עדכון המצב המקומי של התראות - להסיר את ההתראות מהמתנדב הזה
        setChatNotifications(prevNotifications => 
          prevNotifications.filter(notification => notification.senderId !== senderId)
        );
        
        // עדכון מספר ההודעות הלא נקראות
        const removedCount = unreadMessagesSnapshot.size;
        setUnreadMessages(prevCount => Math.max(0, prevCount - removedCount));
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
    
    // מעבר לדף הצ'אט עם המתנדב
    navigation.navigate('ChatScreen', { 
      volunteerId: senderId,
      volunteerName: senderName
    });
    
    setIsNotificationOpen(false);
  };
  
  const handleApplicationNotification = async (notification) => {
    try {
      // סימון ההתראה כנקראה
      const db = getFirestore();
      const notificationRef = doc(db, 'notifications', notification.id);
      await updateDoc(notificationRef, { read: true });
      
      // עדכון המצב המקומי - הסרת ההתראה מהרשימה
      setApplicationNotifications(prev => prev.filter(item => item.id !== notification.id));
      
      // מעבר לדף ההתנדבויות
      navigation.navigate('UserVolunteering', { userId: user.uid });
      
      setIsNotificationOpen(false);
    } catch (error) {
      console.error('Error handling notification:', error);
    }
  };

  const navigateToAllChats = () => navigation.navigate('AllChatsScreen', { userId: user.uid });
  const navigateToSeeVolunteering = () => navigation.navigate('UserVolunteering', { userId: user.uid });
  const navigateToSeeVolunteer = () => navigation.navigate('VolunteersListScreen', { userId: user.uid });
  const navigateToEditProfile = () => navigation.navigate('EditProfile_organ', { userId: user.uid });
  const navigateToChatList = () => navigation.navigate('ChatListScreen', { userId: user.uid });


  useFocusEffect(
    React.useCallback(() => {
      const fetchUserData = async () => {
        try {
          const auth = getAuth();
          const currentUser = auth.currentUser;

          if (!currentUser) {
            console.error('No user is currently signed in.');
            setFirstName('משתמש');
            return;
          }

          const userId = currentUser.uid;
          const db = getFirestore();
          const userDocRef = doc(db, 'users', userId);

          const userSnapshot = await getDoc(userDocRef);

          if (userSnapshot.exists()) {
            const userData = userSnapshot.data();
            setFirstName(userData.firstName || 'משתמש');
          } else {
            setFirstName('משתמש');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setFirstName('משתמש');
        }
      };

      fetchUserData();
    }, [user.uid])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollToOffset({
          offset: (currentSlide + 1) % slides.length * width,
          animated: true,
        });
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentSlide]);

  return (
    <Pressable style={styles.container} onPress={closeMenu}>
      <ImageBackground
        source={require('../../assets/image copy 7.png')}
        style={styles.backgroundImage}
      >
        <Animated.View 
          style={[
            styles.mainContentContainer,
            {
              transform: [
                { scale: mainContentScale },
                { translateX: mainContentTranslate }
              ]
            }
          ]}
        >
          <View style={styles.container}>
            <View style={styles.header}>
              <View style={{ alignItems: 'flex-end', width: '60%' }}>
                <Text style={styles.greeting}>ברוך הבא, {firstName || 'הארגון'}!</Text>
                <Text style={styles.subtitle}>ברוך הבא למרחב הבטוח</Text>
              </View>
              
              <View style={styles.headerIcons}>
                {/* אייקון התראות */}
                <TouchableOpacity onPress={toggleNotifications} style={styles.notificationIcon}>
                  <Ionicons name="notifications" size={24} color="#fff" />
                  {totalNotifications > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>{totalNotifications}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                <View style={styles.profileContainer}>
                  <Image
                    source={require('../../assets/men.png')}
                    style={styles.profileIcon}
                  />
                  
                </View>
              </View>
            </View>

            {/* חלון התראות */}
            {isNotificationOpen && (chatNotifications.length > 0 || applicationNotifications.length > 0) && (
              <View style={styles.notificationPanel}>
                <Text style={styles.notificationTitle}>התראות</Text>
                
                {/* התראות על בקשות התנדבות */}
                {applicationNotifications.length > 0 && (
                  <View style={styles.notificationSection}>
                    <Text style={styles.notificationSectionTitle}>בקשות התנדבות חדשות</Text>
                    {applicationNotifications.map((notification) => (
                      <TouchableOpacity 
                        key={notification.id} 
                        style={[styles.notificationItem, styles.applicationNotification]}
                        onPress={() => handleApplicationNotification(notification)}
                      >
                        <View style={styles.notificationContent}>
                          <Text style={styles.notificationSender}>
                            {notification.userName} הגיש מועמדות ל:
                          </Text>
                          <Text style={styles.notificationMessage} numberOfLines={1}>
                            {notification.volunteeringTitle}
                          </Text>
                        </View>
                        <View style={styles.applicationIcon}>
                          <Ionicons name="person-add" size={20} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                {/* התראות צ'אט */}
                {chatNotifications.length > 0 && (
                  <View style={styles.notificationSection}>
                    <Text style={styles.notificationSectionTitle}>הודעות חדשות</Text>
                    {chatNotifications.map((notification) => (
                      <TouchableOpacity 
                        key={notification.senderId} 
                        style={styles.notificationItem}
                        onPress={() => navigateToChat(notification.senderId, notification.senderName)}
                      >
                        <View style={styles.notificationContent}>
                          <Text style={styles.notificationSender}>{notification.senderName}</Text>
                          <Text style={styles.notificationMessage} numberOfLines={1}>
                            {notification.lastMessage}
                          </Text>
                        </View>
                        <View style={styles.notificationCount}>
                          <Text style={styles.notificationCountText}>{notification.messageCount}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                <TouchableOpacity 
                  style={styles.seeAllNotifications}
                  onPress={navigateToAllChats}
                >
                  <Text style={styles.seeAllNotificationsText}>צפה בכל השיחות</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* חלון ההתראות כשאין הודעות */}
            {isNotificationOpen && chatNotifications.length === 0 && applicationNotifications.length === 0 && (
              <View style={styles.notificationPanel}>
                <Text style={styles.notificationTitle}>התראות</Text>
                <Text style={styles.noNotificationsText}>אין התראות חדשות</Text>
              </View>
            )}

            <View style={styles.sliderContainer}>
              <FlatList
                data={slides}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <ImageBackground
                    source={item.image}
                    style={styles.slide}
                    imageStyle={{
                      borderRadius: 35,
                      resizeMode: 'cover',
                      width: '90%',
                      height: '100%',
                    }}
                  />
                )}
                ref={scrollRef}
                onScroll={Animated.event(
                  [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                  { useNativeDriver: false }
                )}
              />
            </View>

            <View style={styles.menuContainer}>
              <View style={styles.menuRow}>
                <TouchableOpacity style={styles.squareButton} onPress={navigateToSeeVolunteer}>
                  <Image
                    source={require('../../assets/מתנדבים.png')}
                    style={styles.squareImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.squareButtonText}>מתנדבים</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.squareButton} onPress={navigateToSeeVolunteering}>
                  <Image
                    source={require('../../assets/התנדבות.png')}
                    style={styles.squareImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.squareButtonText}>התנדבויות</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity>
                <Image
                  source={require('../../assets/house.png')}
                  style={styles.footerIcon}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={navigateToChatList}>
                <Image
                  source={require('../../assets/love-2.png')}
                  style={styles.footerIcon}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={toggleMenu}>
                <Image
                  source={require('../../assets/menu.png')}
                  style={styles.footerIcon}
                />
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        {isMenuOpen && (
          <>
            <Animated.View 
              style={[
                styles.overlay,
                { opacity: overlayOpacity }
              ]}
            >
              <TouchableOpacity 
                style={styles.overlayTouch}
                onPress={closeMenu}
                activeOpacity={1}
              />
            </Animated.View>
            
            <Animated.View 
              style={[
                styles.sideMenu,
                { 
                  transform: [{ translateX: slideAnim }],
                  shadowColor: '#000',
                  shadowOffset: { width: -5, height: 0 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  elevation: 20,
                }
              ]}
            >
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>תפריט</Text>
                <TouchableOpacity onPress={closeMenu} style={styles.closeButton}>
                  <Ionicons name="close" size={26} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.menuProfile}>
                <Image
                  source={require('../../assets/men.png')}
                  style={styles.menuProfileImage}
                />
                <Text style={styles.menuProfileName}>שלום, {firstName}!</Text>
                <Text style={styles.menuProfileSubtitle}>מארגן רשום</Text>
              </View>
              
              <View style={styles.menuContent}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    navigateToEditProfile();
                  }}
                >
                  <Text style={styles.menuTextOnly}>עריכת פרופיל</Text>
                </TouchableOpacity>
                
                
                
                
                <View style={styles.menuDivider} />
                
                <TouchableOpacity 
                  style={styles.menuItem} 
                  onPress={() => {
                    closeMenu();
                    handleLogout();
                  }}
                >
                  <View style={styles.menuItemLeft}>
                    <Text style={[styles.menuText, { color: '#e74c3c' }]}>התנתקות</Text>
                    <Text style={styles.menuSubText}>יציאה מהמערכת</Text>
                  </View>
                  <View style={[styles.menuIconContainer, { backgroundColor: '#e74c3c' }]}>
                    <Ionicons name="log-out" size={22} color="#fff" />
                  </View>
                </TouchableOpacity>
              </View>
              
              <View style={styles.menuFooter}>
                <Text style={styles.menuFooterText}>המרחב הבטוח שלך</Text>
                <View style={styles.menuFooterDot} />
              </View>
            </Animated.View>
          </>
        )}
      </ImageBackground>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationIcon: {
    position: 'absolute',
    top: 40,
    left:-280,
  },
  notificationBadge: {
    position: 'absolute',
    top: -50,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationPanel: {
    position: 'absolute',
    top: 190,
    right: 90,
    width: 300,
    maxHeight: 400,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  notificationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c6975',
    textAlign: 'center',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 5,
  },
  notificationSection: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  notificationSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    textAlign: 'right',
    marginBottom: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  applicationNotification: {
    backgroundColor: 'rgba(140, 82, 255, 0.05)',
    borderRadius: 8,
    padding: 8,
    borderBottomWidth: 0,
    marginBottom: 8,
  },
  notificationContent: {
    flex: 1,
    marginLeft: 10,
  },
  notificationSender: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
    textAlign: 'right',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'right',
  },
  notificationCount: {
    backgroundColor: '#2c6975',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  applicationIcon: {
    backgroundColor: '#8c52ff',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  notificationCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  seeAllNotifications: {
    marginTop: 10,
    padding: 5,
    borderRadius: 5,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  seeAllNotificationsText: {
    color: '#2c6975',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noNotificationsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#7f8c8d',
    marginVertical: 20,
  },
  header: {
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'transparent',
    marginTop: 70,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    marginLeft: 20,
    marginTop: 30,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: -10,
    right: -6,
    backgroundColor: 'grey',
    padding: 6,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#efefef',
    textAlign: 'right',
    writingDirection: 'rtl',
    marginRight: -70,
    marginTop: 25,
  },
  subtitle: {
    fontSize: 16,
    color: '#efefef',
    textAlign: 'right',
    marginRight: -70,
    writingDirection: 'rtl',
  },
  sliderContainer: {
    width: '90%',
    height: 150,
    marginTop: 30,
    backgroundColor: 'rgba(239, 239, 239, 0.4)',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 3,
    borderColor: '#fff',
    borderRadius: 35,
  },
  slide: {
    width: width * 1,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 35,
    marginHorizontal: width * 0,
    shadowColor: '#a6a6a6',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 30,
    paddingVertical: 10,
    marginBottom: 14,
  },
  footerIcon: {
    width: 30,
    height: 30,
  },
  mainContentContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    zIndex: 999,
  },
  overlayTouch: {
    flex: 1,
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 280,
    height: '100%',
    backgroundColor: '#fff',
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#92b1ac',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
  },
  menuProfile: {
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  menuProfileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#2c6975',
  },
  menuProfileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c6975',
    marginBottom: 4,
  },
  menuProfileSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  menuContent: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  menuItemLeft: {
    flex: 1,
    alignItems: 'flex-end',
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  menuTextOnly: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c6975',
    textAlign: 'center',
    paddingVertical: 8,
    width: '100%',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c6975',
    textAlign: 'right',
    marginBottom: 2,
  },
  menuSubText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 10,
    marginHorizontal: 20,
  },
  menuFooter: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  menuFooterText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  menuFooterDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2c6975',
  },
  menuContainer: {
    width: '90%',
    marginTop: 30,
    backgroundColor: 'rgba(0, 0, 0, 0)',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 0,
    borderColor: '#fff',
    borderRadius: 35,
  },
  menuRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
  },
  squareButton: {
    backgroundColor: '#f2f2f2',
    width: 150,
    height: 150,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 15,
    elevation: 5,
    shadowColor: '#a6a6a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  squareImage: {
    width: 80,
    height: 80,
  },
  squareButtonText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
});

export default Homepage_Organ;
