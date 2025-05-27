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
  Modal,
  Alert,
  PanGestureHandler, // הוסף זה אם אתה רוצה גם swipe gesture
} from 'react-native';
import { getAuth, signOut } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, doc, getDoc, collection, query, where, onSnapshot, orderBy, getDocs, updateDoc } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import SafeButton from './SafeButton';

const { width } = Dimensions.get('window');

const slides = [
  { id: '1', image: require('../../assets/slide1.png') },
  { id: '2', image: require('../../assets/slide2.png') },
  { id: '3', image: require('../../assets/slide3.png') },
];

const Homepage = ({ user, navigation, route }) => {
  const [firstName, setFirstName] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);  const [currentSlide, setCurrentSlide] = useState(0);
  const [gender, setGender] = useState('זכר');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [chatNotifications, setChatNotifications] = useState([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [showVolunteerAlert, setShowVolunteerAlert] = useState(false);
  const [showSafeButton, setShowSafeButton] = useState(false);
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slideIntervalRef = useRef(null);

  const slideAnim = useRef(new Animated.Value(280)).current; // מתחיל מחוץ למסך
const overlayOpacity = useRef(new Animated.Value(0)).current;
const mainContentScale = useRef(new Animated.Value(1)).current; // לאנימציה של התוכן הראשי
const mainContentTranslate = useRef(new Animated.Value(0)).current; // להזזת התוכן הראשי

  // בדיקה האם האפליקציה נפתחה דרך התראה
  useEffect(() => {
    if (route.params?.openedFromNotification) {
      setShowSafeButton(true);
    }
  }, [route.params]);

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigation.replace('Login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // האזנה להודעות חדשות
  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) return;
    
    const db = getFirestore();
    const messagesRef = collection(db, 'chatMessages');
    
    // שאילתה להודעות חדשות שלא נקראו עדיין
    const q = query(
      messagesRef,
      where('receiverId', '==', currentUser.uid),
      where('read', '==', false),
      orderBy('timestamp', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUnreadMessages(newMessages.length);
      
      // ארגון ההודעות לפי שולח
      const notificationsBySender = {};
      newMessages.forEach(msg => {
        if (!notificationsBySender[msg.senderId]) {
          notificationsBySender[msg.senderId] = {
            senderId: msg.senderId,
            senderName: '',
            messageCount: 0,
            lastMessage: ''
          };
        }
        notificationsBySender[msg.senderId].messageCount++;
        if (!notificationsBySender[msg.senderId].lastMessage || 
            msg.timestamp > notificationsBySender[msg.senderId].lastMessageTime) {
          notificationsBySender[msg.senderId].lastMessage = msg.text;
          notificationsBySender[msg.senderId].lastMessageTime = msg.timestamp;
        }
      });
      
      // השגת שמות השולחים
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
                senderData.firstName || senderData.lastName || 'משתמש');
            }
          } catch (error) {
            console.error('Error fetching sender name:', error);
          }
        }
        setChatNotifications(notifications);
      };
      
      if (Object.keys(notificationsBySender).length > 0) {
        fetchSenderNames();
      } else {
        setChatNotifications([]);
      }
    });
    
    return () => unsubscribe();
  }, []);

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
            setGender(userData.gender || 'זכר');
          } else {
            setFirstName('משתמש');
            setGender('');
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          setFirstName('משתמש');
          setGender('');
        }
      };
  
      fetchUserData();
    }, [])
  );

  useEffect(() => {
    if (showVolunteerAlert) return; // אל תתחיל את האינטרוול אם המודל פתוח
  
    slideIntervalRef.current = setInterval(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollToOffset({
          offset: (currentSlide + 1) % slides.length * width,
          animated: true,
        });
        setCurrentSlide((prev) => (prev + 1) % slides.length);
      }
    }, 3000);
  
    return () => clearInterval(slideIntervalRef.current);
  }, [currentSlide, showVolunteerAlert]);

  useEffect(() => {
    if (showVolunteerAlert && slideIntervalRef.current) {
      clearInterval(slideIntervalRef.current);
    }
  }, [showVolunteerAlert]);

  const openMenu = () => {
    setIsMenuOpen(true);
    Animated.parallel([
      // הזזת התפריט פנימה
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      // הופעת הרקע השקוף
      Animated.timing(overlayOpacity, {
        toValue: 0.6,
        duration: 400,
        useNativeDriver: true,
      }),
      // הקטנה והזזה של התוכן הראשי
      Animated.timing(mainContentScale, {
        toValue: 0.85,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(mainContentTranslate, {
        toValue: -50, // הזזה שמאלה
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };
  
  // 3. שנה את פונקציית closeMenu:
  
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
      // החזרת התוכן הראשי למצב רגיל
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

  const closeMenuAndNotifications = () => {
    if (isMenuOpen) {
      closeMenu();
    }
    if (isNotificationOpen) {
      setIsNotificationOpen(false);
    }
  };

  const navigateToChat = async (senderId, senderName) => {
    // סימון ההודעות כנקראות לפני המעבר לדף הצ'אט
    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        const chatId = [currentUser.uid, senderId].sort().join('_');
        const db = getFirestore();
        const messagesRef = collection(db, 'chatMessages');
        
        // שאילתה שמחזירה את כל ההודעות הלא נקראות מהשולח הספציפי
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
        
        // עדכון המצב המקומי של התראות - להסיר את ההתראות מהשולח הזה
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
    
    // מעבר לדף הצ'אט
    navigation.navigate('ChatScreen', { 
      volunteerId: senderId,
      volunteerName: senderName
    });
    
    setIsNotificationOpen(false);
  };

  const navigateToShelters = () => navigation.navigate('ShelterMap');
  const navigateToLocation = () => navigation.navigate('EmergencyLocationsScreen');


  // בדיקת פרופיל מתנדב לפני מעבר לעמוד ההתנדבויות
  const navigateToAll = async () => {
    try {
      // בדיקה האם למשתמש יש פרופיל מתנדב
      const db = getFirestore();
      const volunteerProfileRef = doc(db, 'volunteerProfiles', user.uid);
      const volunteerProfileSnap = await getDoc(volunteerProfileRef);
      
      // אם קיים פרופיל מתנדב, מעבר לעמוד ההתנדבויות
      if (volunteerProfileSnap.exists()) {
        navigation.navigate('AllVolunteering', { userId: user.uid });
      } else {
        // אם אין פרופיל מתנדב, הצגת התראה
        setShowVolunteerAlert(true);
      }
    } catch (error) {
      console.error('Error checking volunteer profile:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בבדיקת פרופיל המתנדב');
    }
  };

  const navigateToEditProfile = () => navigation.navigate('EditProfile_general', { userId: user.uid });
  const navigateToHomePage = () => navigation.navigate('HomePage', { userId: user.uid });
  const navigateToWhatToDo = () => {
    navigation.navigate('WhatToDo', { source: 'HomePage' });
  };

  const navigateToAI = () => {
    navigation.navigate('Chat_AI', { source: 'HomePage' });
  };

  const navigateToEmergencyContacts = () => {
    navigation.navigate('EmergencyContactsScreen', { userId: user.uid });
  };

  const navigateToAlert = () => navigation.navigate('BeParent', { userId: user.uid });
  const navigateToChatList = () => navigation.navigate('ChatListScreen', { userId: user.uid });
  const navigateToAllChats = () => navigation.navigate('AllChatsScreen', { userId: user.uid });
  const navigateTokids = () => navigation.navigate('ChildProfilesScreen', { userId: user.uid });

  // קומפוננטת המודל להתראת יצירת פרופיל מתנדב
  const VolunteerProfileAlert = () => (
    <Modal
      transparent={true}
      animationType="fade"
      visible={showVolunteerAlert}
      onRequestClose={() => setShowVolunteerAlert(false)}
    >
      <View style={alertStyles.modalContainer}>
        <View style={alertStyles.modalContent}>
          <Text style={alertStyles.modalTitle}>יצירת פרופיל מתנדב</Text>
          <Text style={alertStyles.modalText}>עליך ליצור פרופיל מתנדב כדי לצפות בהתנדבויות</Text>
          
          <View style={alertStyles.buttonContainer}>
            <TouchableOpacity 
              style={alertStyles.createButton} 
              onPress={() => {
                setShowVolunteerAlert(false);
                navigation.navigate('VolunteerProfileScreen', { userId: user.uid });
              }}
            >
              <Text style={alertStyles.createButtonText}>צור פרופיל</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={alertStyles.closeButton} 
              onPress={() => setShowVolunteerAlert(false)}
            >
              <Text style={alertStyles.closeButtonText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <Pressable style={styles.container} onPress={closeMenuAndNotifications}>
      <ImageBackground
        source={require('../../assets/image copy 7.png')}
        style={styles.backgroundImage}
      >
        {/* עטיפת התוכן הראשי באנימציה */}
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
            {/* Header */}
            <View style={styles.header}>
              <View style={{ alignItems: 'flex-end', width: '60%' }}>
                <Text style={styles.greeting}>היי, {firstName}!</Text>
                <Text style={styles.subtitle}>ברוך הבא למרחב הבטוח</Text>
              </View>
  
              <View style={styles.headerIcons}>
                {/* אייקון התראות */}
                <TouchableOpacity onPress={toggleNotifications} style={styles.notificationIcon}>
                  <Ionicons name="notifications" size={24} color="#fff" />
                  {unreadMessages > 0 && (
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>{unreadMessages}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                
                <View style={styles.profileContainer}>
                  <Image
                    source={gender === 'זכר' ? require('../../assets/men.png') : require('../../assets/women.png')}
                    style={styles.profileIcon}
                  />
                </View>
              </View>
            </View>
  
            {/* חלון התראות */}
            {isNotificationOpen && chatNotifications.length > 0 && (
              <View style={styles.notificationPanel}>
                <Text style={styles.notificationTitle}>התראות</Text>
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
                <TouchableOpacity 
                  style={styles.seeAllNotifications}
                  onPress={navigateToAllChats}
                >
                  <Text style={styles.seeAllNotificationsText}>צפה בכל השיחות</Text>
                </TouchableOpacity>
              </View>
            )}
  
            {/* חלון ההתראות כשאין הודעות */}
            {isNotificationOpen && chatNotifications.length === 0 && (
              <View style={styles.notificationPanel}>
                <Text style={styles.notificationTitle}>התראות</Text>
                <Text style={styles.noNotificationsText}>אין הודעות חדשות</Text>
              </View>
            )}
  
            {/* Slides */}
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
            
            {showSafeButton && (
              <View style={styles.safeButtonContainer}>
                <SafeButton />
              </View>
            )}
            
            {/* Icons */}
            <View style={styles.iconContainer}>
              <TouchableOpacity style={styles.iconButton} onPress={navigateToShelters}>
                <Image
                  source={require('../../assets/מיקום.png')}
                  style={styles.icon}
                  resizeMode="contain"
                />
                <Text style={styles.t1}>איתור מרחב מוגן</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={navigateToAll}>
                <Image
                  source={require('../../assets/התנדבות.png')}
                  style={styles.icon}
                  resizeMode="contain"
                />
                <Text style={styles.t1}>התנדבות</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={navigateToAI}>
                <Image
                  source={require('../../assets/צאט.png')}
                  style={styles.icon}
                  resizeMode="contain"
                />
                <Text style={styles.t1}>צ'אט AI</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={navigateTokids}>
                <Image
                  source={require('../../assets/קידס.png')}
                  style={styles.icon}
                  resizeMode="contain"
                />
                <Text style={styles.t1}>KidsZone</Text>
              </TouchableOpacity>
            </View>
  
            {/* Footer */}
            <View style={styles.footer}>
              <TouchableOpacity onPress={navigateToHomePage}>
                <Image
                  source={require('../../assets/house.png')}
                  style={styles.footerIcon}
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={navigateToWhatToDo}>
                <Image
                  source={require('../../assets/mark.png')}
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
  
        {/* Menu והרקע השקוף - מחוץ לעטיפת התוכן הראשי */}
        {isMenuOpen && (
          <>
            {/* רקע שקוף */}
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
            
            {/* חלונית הצד */}
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
              {/* כותרת התפריט */}
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>תפריט</Text>
                <TouchableOpacity onPress={closeMenu} style={styles.closeButton}>
                  <Ionicons name="close" size={26} color="#fff" />
                </TouchableOpacity>
              </View>
              
              {/* פרופיל המשתמש */}
              <View style={styles.menuProfile}>
                <Image
                  source={gender === 'זכר' ? require('../../assets/men.png') : require('../../assets/women.png')}
                  style={styles.menuProfileImage}
                />
                <Text style={styles.menuProfileName}>שלום, {firstName}!</Text>
                <Text style={styles.menuProfileSubtitle}>משתמש רשום</Text>
              </View>
              
              {/* פריטי התפריט */}
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
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    navigateToEmergencyContacts();
                  }}
                >
                  <Text style={styles.menuTextOnly}>אנשי חירום</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    navigateToLocation();
                  }}
                >
                  <Text style={styles.menuTextOnly}>אזורי התראה</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    navigateToAlert();
                  }}
                >
                  <Text style={styles.menuTextOnly}>דף להורים</Text>
                </TouchableOpacity>
                
                <View style={styles.menuDivider} />
                
                <TouchableOpacity 
  style={styles.logoutMenuItem}
  onPress={() => {
    closeMenu();
    handleLogout();
  }}
>
  <View style={styles.logoutTextContainer}>
    <Text style={styles.logoutText}>התנתקות</Text>
    <Text style={styles.logoutSubText}>יציאה מהמערכת</Text>
  </View>
  <View style={styles.logoutIconContainer}>
    <Ionicons name="log-out" size={22} color="white" />
  </View>
</TouchableOpacity>

              </View>
              
              {/* כותרת תחתונה */}
              <View style={styles.menuFooter}>
                <Text style={styles.menuFooterText}>המרחב הבטוח שלך</Text>
                <View style={styles.menuFooterDot} />
              </View>
            </Animated.View>
          </>
        )}
  
        {/* מודל להתראת יצירת פרופיל מתנדב */}
        <VolunteerProfileAlert />
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
  mainContentContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
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
    top: 50,
    left: -300,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
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
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
  notificationCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
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
  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    justifyContent: 'space-between',
  },
  
  logoutTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
    textAlign: 'right',
    marginBottom: 2,
  },
  
  logoutSubText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
  },
  
  // הסר את ההגדרה הכפולה של menuIconContainer והשאר רק את זו:
  logoutIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    marginLeft: 15,
  },
  
  // שמור את menuIconContainer הרגיל עבור שאר הפריטים (אם יש):
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2c6975', // או כל צבע אחר שאתה רוצה
    marginLeft: 15,
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
  t1: {
    fontSize: 16,
    color: '#2c6975',
    textAlign: 'right',
    marginTop: 10,
    writingDirection: 'rtl',
  },
  safeButtonContainer: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
  },
  sliderContainer: {
    width: '90%',
    height: 150,
    marginTop: -10,
    marginBottom: -200,
    backgroundColor: 'rgba(239, 239, 239, 0.4)',
    shadowColor: '#fff',
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
  iconContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    marginVertical: 10,
    shadowColor: '#a6a6a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
    marginTop: 140,
  },
  iconButton: {
    backgroundColor: '#f2f2f2',
    width: 150,
    height: 150,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 15,
    elevation: 5,
  },
  icon: {
    width: 80,
    height: 80,
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
  menu: {
    position: 'absolute',
    bottom: 73,
    right: 10,
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    writingDirection: 'rtl',
    elevation: 5,
  },
  menuItem: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
});

// סטייל עבור חלון התראת יצירת פרופיל מתנדב 
const alertStyles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c6975',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  createButton: {
    backgroundColor: '#2c6975',
    padding: 10,
    borderRadius: 8,
    width: '45%',
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#e0e0e0',
    padding: 10,
    borderRadius: 8,
    width: '45%',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#333', 
    fontSize: 16,
  },
});

export default Homepage;
