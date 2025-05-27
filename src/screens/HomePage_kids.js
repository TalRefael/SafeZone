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
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

const slides = [
  { id: '1', image: require('../../assets/slide1.png') },
  { id: '2', image: require('../../assets/slide2.png') },
  { id: '3', image: require('../../assets/slide3.png') },
];

const HomePage_kids = ({ route, navigation }) => {
  const { childData } = route.params || {}; // קבלת מידע על הילד מפרמטרי הניתוב
  
  const [firstName, setFirstName] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [gender, setGender] = useState('זכר');
  const [childInfo, setChildInfo] = useState(null);
  const scrollRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  // Add animation refs
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

  useFocusEffect(
    React.useCallback(() => {
      const fetchChildData = async () => {
        try {
          // If we have child data from route params, use it
          if (childData) {
            console.log('Using child data from params:', childData);
            setFirstName(childData.fullName || childData.username || 'משתמש');
            setGender(childData.gender || 'זכר');
            setChildInfo(childData);
            return;
          }
          
          // Only try Firebase Auth if no child data was passed
          const auth = getAuth(); 
          const currentUser = auth.currentUser; 
          
          if (!currentUser) {
            console.log('No user is currently signed in, but this might be a child profile');
            setFirstName('משתמש');
            return;
          }
          
          // Rest of your existing fetch logic for parent users...
        } catch (error) {
          console.error('Error fetching child data:', error);
          setFirstName('משתמש');
        }
      };
  
      fetchChildData();
    }, [childData])
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
  };

  // Navigation functions with user/child data
  const navigateToShelters = () => navigation.navigate('ShelterMap');
  const navigateToChatList = () => navigation.navigate('ChatListScreen', { 
    childData: childInfo,
    isChildUser: true 
  });

  const navigateToHomePage = () => {
    // העבר את נתוני הילד למסך הבית
    navigation.navigate('HomePage_kids', { 
      userId: childInfo?.parentId || '',
      childData: childInfo 
    });
  };
  
  const navigateToWhatToDo = () => {
    navigation.navigate('WhatToDo', { source: 'HomePage_kids', childData: childData });
  };
  
  const navigateToAI = () => {
    navigation.navigate('Chat_AI', { source: 'HomePage_kids', childData: childData });

    
  };
  
  const navigateTokids = () => {
    // נווט למסך פרופילי ילדים
    navigation.navigate('ChatAI_kids', { 
      userId: childInfo?.parentId || '' 
    });
  };

  return (
    <Pressable style={styles.container} onPress={closeMenu}>
      <ImageBackground
        source={require('../../assets/kidsback.png')}
        style={styles.backgroundImage}
      >
        {/* Wrap main content in Animated.View */}
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
                <View style={styles.profileContainer}>
                  {/* תמונה לפי מגדר */}
                  <Image
                    source={gender === 'זכר' ? require('../../assets/men.png') : require('../../assets/women.png')}
                    style={styles.profileIcon}
                  />
                </View>
              </View>
            </View>
              {/* לוטי: אנימציה בחלק התחתון בצד */}
              <LottieView
            source={require('../../assets/animations/rabbit.json')} // הנתיב לאנימציה
            autoPlay
            loop
            style={styles.lottie}
          />
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

            {/* Icons - 2 in a row */}
            <View style={styles.iconContainer}>
              <View style={styles.iconRow}>
                <TouchableOpacity style={styles.iconButton} onPress={navigateToShelters}>
                  <Image
                    source={require('../../assets/מיקום.png')}
                    style={styles.icon}
                    resizeMode="contain"
                  />
                  <Text style={styles.t1}>איתור מרחב מוגן</Text>
                </TouchableOpacity>
                
        
              </View>
              
              {/* 1 centered below */}
              <View style={styles.centerIconRow}>
                <TouchableOpacity style={styles.iconButton} onPress={navigateTokids}>
                  <Image
                    source={require('../../assets/קידס.png')}
                    style={styles.icon}
                    resizeMode="contain"
                  />
                  <Text style={styles.t1}>KidsZone</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Menu and overlay */}
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
                  source={gender === 'זכר' ? require('../../assets/men.png') : require('../../assets/women.png')}
                  style={styles.menuProfileImage}
                />
                <Text style={styles.menuProfileName}>שלום, {firstName}!</Text>
                <Text style={styles.menuProfileSubtitle}>משתמש ילד</Text>
              </View>
              
              <View style={styles.menuContent}>
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
              
              <View style={styles.menuFooter}>
                <Text style={styles.menuFooterText}>המרחב הבטוח שלך</Text>
                <View style={styles.menuFooterDot} />
              </View>
            </Animated.View>
          </>
        )}

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
  lottie: {
    position: 'absolute',
    bottom: 90, // מרחק מהרצפה
    left: 260,   // מרחק מהצד השמאלי
    width: width * 0.5, // גודל יחסי
    height: width * 0.5, // שומרים על פרופורציה
    zIndex: 3,
    pointerEvents: 'none',
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
    width: '100%',
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#a6a6a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 5,
    marginTop: 140,
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  centerIconRow: {
    marginTop: 30,
    alignItems: 'center',
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
    backgroundColor: '#ffde84',
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
  logoutIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    marginLeft: 15,
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
});

export default HomePage_kids;
