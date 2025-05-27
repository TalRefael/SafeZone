import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ImageBackground,
  Image,
  Animated,
  Dimensions,
  TouchableWithoutFeedback, // Added for better touch handling
  Pressable,
} from 'react-native';
import { getFirestore, collection, query, where, getDocs, deleteDoc, doc,getDoc, } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const UserVolunteerings = ({ navigation }) => {
  const [volunteerings, setVolunteerings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [userId, setUserId] = useState('');
  const db = getFirestore();
  const auth = getAuth();

  // Menu animations
  const slideAnim = useRef(new Animated.Value(280)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const mainContentScale = useRef(new Animated.Value(1)).current;
  const mainContentTranslate = useRef(new Animated.Value(0)).current;

  // Existing animations
  const translateY = useRef(new Animated.Value(-1000)).current;
  const titleAnimation = useRef(new Animated.Value(0)).current;
  const heartAnimation = useRef(new Animated.Value(1)).current;
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const animationValues = useRef({}).current; // Changed to object for better referencing
  const buttonAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const handleLogout = async () => {
    try {
      setLoading(true); // Show loading state
      await signOut(auth);
      // Clear any local state
      setVolunteerings([]);
      setIsMenuOpen(false);
      // Navigate to login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error logging out:', error);
      Alert.alert(
        'שגיאה בהתנתקות',
        'אירעה שגיאה בעת ניסיון להתנתק. אנא נסה שוב.',
        [{ text: 'אישור' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Add useEffect for fetching user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;

        if (!currentUser) {
          console.error('No user is currently signed in.');
          setFirstName('משתמש');
          return;
        }

        const currentUserId = currentUser.uid;
        setUserId(currentUserId);
        const userDocRef = doc(db, 'users', currentUserId);

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
  }, []);

  // Menu functions
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

  useEffect(() => {
    Animated.sequence([
      Animated.timing(translateY, {
        toValue: height * -0.8,
        duration: 500,
        useNativeDriver: true,
      }),
    
      Animated.timing(titleAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();

    buttonAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: index * 300,
        useNativeDriver: true,
      }).start();
    });
  }, []);

  // Fetch volunteerings on screen focus
  useFocusEffect(
    React.useCallback(() => {
      const fetchVolunteerings = async () => {
        const user = auth.currentUser;
        if (!user) {
          Alert.alert('לא נמצאה כניסת משתמש');
          return;
        }

        try {
          const q = query(
            collection(db, 'volunteerings'),
            where('userId', '==', user.uid)
          );
          const querySnapshot = await getDocs(q);
          const volunteeringsList = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setVolunteerings(volunteeringsList);
          setLoading(false);

          // Initialize animation values for each card
          volunteeringsList.forEach((item, index) => {
            if (!animationValues[item.id]) {
              animationValues[item.id] = new Animated.Value(0);
              
              // Start animation with delay based on index
              Animated.timing(animationValues[item.id], {
                toValue: 1,
                duration: 400,
                delay: index * 300,
                useNativeDriver: true,
              }).start();
            }
          });
        } catch (error) {
          console.error('Error fetching volunteerings:', error);
          Alert.alert('שגיאה בטעינת ההתנדבויות');
        }
      };

      fetchVolunteerings();
      
      Animated.spring(searchAnimation, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }, [])
  );

  const handleDeleteVolunteering = async (id) => {
    try {
      await deleteDoc(doc(db, 'volunteerings', id));
      Alert.alert('ההתנדבות נמחקה בהצלחה');
      setVolunteerings((prevVolunteerings) =>
        prevVolunteerings.filter((item) => item.id !== id)
      );
    } catch (error) {
      console.error('Error deleting volunteering:', error);
      Alert.alert('שגיאה במחקת ההתנדבות');
    }
  };

  const handleHeartPress = () => {
    Animated.sequence([
      Animated.timing(heartAnimation, {
        toValue: 1.5,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(heartAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // פונקציה עזר לפורמט תאריך
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('he-IL');
    } catch (e) {
      console.error('Error formatting date:', e);
      return dateString;
    }
  };

  const formatLocation = (location) => {
    if (!location) return 'לא זמין';
    if (typeof location === 'object' && location !== null) {
      if (location.city && location.address) {
        return `${location.city}, ${location.address}`;
      } else if (location.city) {
        return location.city;
      } else if (location.address) {
        return location.address;
      }
    }
    return String(location);
  };

  const renderVolunteering = ({ item, index }) => {
    // Initialize animation value if it doesn't exist
    if (!animationValues[item.id]) {
      animationValues[item.id] = new Animated.Value(0);
      
      // Start animation with delay based on index
      Animated.timing(animationValues[item.id], {
        toValue: 1,
        duration: 400,
        delay: index * 300,
        useNativeDriver: true,
      }).start();
    }
  
    const navigateToDetails = () => {
      console.log('Card pressed, navigating to details for:', item.id);
      navigation.navigate('OrganVoluDetails', { volunteering: item });
    };
  
    const confirmDelete = () => {
      Alert.alert(
        'האם אתה בטוח?',
        'האם אתה בטוח שברצונך למחוק את ההתנדבויות?',
        [
          { text: 'לא', style: 'cancel' },
          { text: 'כן', onPress: () => handleDeleteVolunteering(item.id) },
        ]
      );
    };
  
    const navigateToEdit = () => {
      navigation.navigate('EditVolunteering', { volunteering: item });
    };
  
    const isFull = item.availableSlots === "0";
  
    return (
      <Animated.View
        style={[
          styles.card,
          { 
            opacity: animationValues[item.id],
            transform: [{ scale: animationValues[item.id] }],
            width: '100%'
          },
        ]}
      >
        <TouchableWithoutFeedback onPress={navigateToDetails}>
          <View style={[styles.square, { width: '100%' }]}>
            <Text style={[styles.squareText, { fontWeight: 'bold' }]}>{item.title}</Text>
            <Text style={styles.squareText}>{item.shortDescription || ''}</Text>
            <Text style={styles.squareText}>{formatLocation(item.location)}</Text>
            <Text style={styles.squareText}>{formatDate(item.date)}</Text>
            
            {isFull && (
              <View style={styles.fullCapacityContainer}>
                <Text style={styles.fullCapacityText}>תפוסה מלאה</Text>
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
        
        <TouchableOpacity
          style={[styles.deleteButton, { top: 120 }]}
          onPress={confirmDelete}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash" size={24} color="black" />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.editButton, { top: 120 }]}
          onPress={navigateToEdit}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="pencil" size={18} color="black" />
        </TouchableOpacity>
  
        <TouchableOpacity
          style={[styles.notificationButton, { top: 15 }]}
          onPress={() => navigation.navigate('VolunteeringRequests', { volunteeringId: item.id })}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="notifications" size={24} color="black" />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <Pressable style={styles.container} onPress={closeMenu}>
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
        <ImageBackground
          source={require('../../assets/all2.png')}
          style={styles.backgroundImage}
        >
          <View style={styles.container} pointerEvents="box-none">
            <Animated.View
              style={[
                styles.halfCircle,
                {
                  transform: [{ translateY }],
                },
              ]}
              pointerEvents="none"
            >
              <LinearGradient
                colors={['#ff5757', '#8c52ff', '#ff5757']}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
              />
            </Animated.View>

            <Animated.Text
              style={[
                styles.circleTitle,
                {
                  opacity: titleAnimation,
                  transform: [
                    {
                      translateY: titleAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [50, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              ההתנדבויות שלי
            </Animated.Text>

            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <Animated.View
              style={[
                styles.addButtonContainer,
                {
                  transform: [
                    {
                      translateY: searchAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [100, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => navigation.navigate('AddVolunteering')}
              >
                <Ionicons name="add" size={24} color="black" />
              </TouchableOpacity>
            </Animated.View>

            <View style={styles.listContainer}>
  <FlatList
    data={volunteerings}
    keyExtractor={(item) => item.id}
    renderItem={renderVolunteering}
    numColumns={1}
    contentContainerStyle={{ 
      direction: 'rtl', 
      paddingTop: 20, // פחות padding כי יש margin בקונטיינר
      paddingHorizontal: 10,
      paddingBottom: 20
    }}
  />
</View>
          </View>

          <View style={styles.footer}>
            <LinearGradient
              colors={['#ff5757', '#8c52ff', '#ff5757']}
              locations={[0, 0.5, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.footerGradient}
            >
              {[
                { 
                  icon: require('../../assets/menu.png'), 
                  action: toggleMenu,
                  testID: 'menuButton'
                },
                { 
                  icon: require('../../assets/love-2.png'), 
                  action: () => navigation.navigate('ChatListScreen'),
                  testID: 'heartButton'
                },
                { 
                  icon: require('../../assets/house.png'), 
                  action: () => navigation.navigate('HomePage_organ'),
                  testID: 'homeButton'
                },
              ].map((item, index) => (
                <Animated.View
                  key={index}
                  style={{
                    opacity: buttonAnimations[index],
                    transform: [{ scale: buttonAnimations[index] }],
                  }}
                >
                  <TouchableOpacity 
                    onPress={item.action} 
                    style={styles.footerButton}
                    activeOpacity={0.7}
                    testID={item.testID}
                  >
                    <Image source={item.icon} style={styles.footerIcon} />
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </LinearGradient>
          </View>
        </ImageBackground>
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
              <Text style={styles.menuProfileName}>שלום, {firstName || 'משתמש'}!</Text>
              <Text style={styles.menuProfileSubtitle}>מארגן רשום</Text>
            </View>
            
            <View style={styles.menuContent}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  closeMenu();
                  navigation.navigate('EditProfile_organ', { userId: userId });
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
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContentContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  halfCircle: {
    position: 'absolute',
    top: 0,
    left: width / 2 - 500,
    width: 1000,
    height: 1000,
    borderRadius: 400,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
  circleTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    position: 'absolute',
    top: 100,
    width: '100%',
    zIndex: 1,
    marginTop: -20,
  },
  backButton: {
    position: 'absolute',
    top:45,
    left: 20,
    padding: 10,
    zIndex: 5,
  },
  addButtonContainer: {
    position: 'absolute',
    top: 45,
    right: 20,
    zIndex: 10,
  },
  addButton: {
    backgroundColor: '#fff',
    borderRadius: 50,
    padding: 15,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  card: {
    flex: 1,
    position: 'relative',
    marginTop: 20, // הקטן מ-50 ל-20
    marginHorizontal: 5,
    maxWidth: '95%',
    alignSelf: 'center',
  },
  square: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 20,
    height: 150,
    justifyContent: 'flex-start',
    margin: 5,
    elevation: 5,
    shadowColor: '#a6a6a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  squareText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 8,
    top: 15,
  },
  deleteButton: {
    position: 'absolute',
    right: 15,
    top: 15,
    backgroundColor: 'transparent',
    padding: 5,
    borderRadius: 50,
    zIndex: 20,
  },
  editButton: {
    position: 'absolute',
    left: 15,
    top: 15,
    backgroundColor: 'transparent',
    padding: 5,
    borderRadius: 50,
    zIndex: 20,
  },
  notificationButton: {
    position: 'absolute',
    left: 15,
    top: 50,
    backgroundColor: 'transparent',
    padding: 5,
    borderRadius: 50,
    zIndex: 20,
  },
  fullCapacityContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  fullCapacityText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
    marginTop: 120, // מרווח מהכותרת
    paddingBottom: 100, // מרווח מה-footer
  },

  footer: {
    width: '100%',
    height: 70,
    position: 'absolute',
    bottom: 0,
    overflow: 'hidden',
  },
  footerGradient: {
    flex: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerIcon: {
    width: 30,
    height: 30,
  },
  // Menu styles
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
    backgroundColor: '#c254af',
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
});

export default UserVolunteerings;
