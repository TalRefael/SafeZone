import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ImageBackground,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  arrayUnion,
  getDoc,
  doc,
  updateDoc,
} from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const AllVolunteerings = ({ navigation }) => {
  const [volunteerings, setVolunteerings] = useState([]);
  const [likedVolunteerings, setLikedVolunteerings] = useState([]);
  const [applications, setApplications] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [searchType, setSearchType] = useState('location');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [filteredVolunteerings, setFilteredVolunteerings] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const animationValues = useRef([]);
  const searchAnimation = useRef(new Animated.Value(0));
  const heartAnimation = useRef(new Animated.Value(0));
  const titleAnimation = useRef(new Animated.Value(0)).current;
  const editProfileAnimation = useRef(new Animated.Value(0));

  // Menu animations
  const slideAnim = useRef(new Animated.Value(280)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const mainContentScale = useRef(new Animated.Value(1)).current;
  const mainContentTranslate = useRef(new Animated.Value(0)).current;
  
  const translateY = useRef(new Animated.Value(-1000)).current;
  const buttonAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const db = getFirestore();
  const auth = getAuth();

  const handleLogout = async () => {
    try {
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
  };

  const closeMenuAndNotifications = () => {
    if (isMenuOpen) {
      closeMenu();
    }
  };

  const navigateToEditProfile = () => {
    closeMenu();
    navigation.navigate('EditVolunteerProfile', { userId: auth.currentUser.uid });
  };

  const navigateToEmergencyContacts = () => {
    closeMenu();
    navigation.navigate('EmergencyContactsScreen', { userId: auth.currentUser.uid });
  };

  const navigateToLocation = () => {
    closeMenu();
    navigation.navigate('EmergencyLocationsScreen');
  };

  const navigateToAlert = () => {
    closeMenu();
    navigation.navigate('BeParent', { userId: auth.currentUser.uid });
  };

  const navigateToHomePage = () => {
    closeMenu();
    navigation.navigate('HomePage');
  };

  const navigateToWhatToDo = () => {
    closeMenu();
    navigation.navigate('WhatToDo', { source: 'HomePage' });
  };

  // פונקציה משופרת לטעינת בקשות התנדבות
  const fetchApplications = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return {};
      
      // טעינת הבקשות שהגשת
      const applicationsRef = collection(db, 'applications');
      const q = query(applicationsRef, where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const applicationsData = {};
      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.volunteeringId && data.status) {
          applicationsData[data.volunteeringId] = data.status;
        }
      });
      
      console.log('Fetched user applications:', applicationsData);
      setApplications(applicationsData);
      return applicationsData; // החזר את הנתונים כדי שנוכל להשתמש בהם
    } catch (error) {
      console.error('Error fetching applications:', error);
      return {};
    }
  };

  const fetchVolunteerings = async (applicationsData = {}) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setLoading(false);
        return;
      }
      
      // אם לא העברנו מידע על בקשות, נשתמש במידע מהמצב (state)
      const appData = Object.keys(applicationsData).length > 0 ? applicationsData : applications;
      
      const querySnapshot = await getDocs(collection(db, 'volunteerings'));
      let volunteeringsList = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        isOffered: false, // תמיד מאתחל ל-false כברירת מחדל
        status: null, // מאתחל status ל-null כברירת מחדל
        applicationStatus: null // שדה חדש עבור סטטוס הבקשה שהגיש המשתמש
      }));
      
      // Fetch the volunteer profile to get offered tasks
      const volunteerProfileRef = doc(db, 'volunteerProfiles', user.uid);
      const volunteerProfileDoc = await getDoc(volunteerProfileRef);
      
      if (volunteerProfileDoc.exists()) {
        const volunteerData = volunteerProfileDoc.data();
        const offeredTasks = volunteerData.offeredTasks || [];
        
        console.log('Offered tasks:', offeredTasks);
        
        // Mark tasks that are offered to this volunteer
        volunteeringsList = volunteeringsList.map(task => {
          // בדיקה אם המשימה מוצעת למשתמש
          const offeredTask = offeredTasks.find(offered => 
            offered.id === task.id || offered.volunteeringId === task.id
          );
          
          if (offeredTask) {
            console.log('Found offered task:', task.id, offeredTask.status);
            return { 
              ...task, 
              isOffered: true, // עדכון דגל ל-true להצעות
              status: offeredTask.status || 'pending'
            };
          }
          
          // בדיקה אם יש בקשה שהוגשה למשימה זו
          if (appData[task.id]) {
            console.log('Found application for task:', task.id, appData[task.id]);
            return {
              ...task,
              applicationStatus: appData[task.id]
            };
          }
          
          return task;
        });
        
        // Sort so offered tasks appear first, then tasks with applications
        volunteeringsList.sort((a, b) => {
          if (a.isOffered && !b.isOffered) return -1;
          if (!a.isOffered && b.isOffered) return 1;
          if (a.applicationStatus && !b.applicationStatus) return -1;
          if (!a.applicationStatus && b.applicationStatus) return 1;
          return 0;
        });
      }
      
      console.log('Volunteerings list after processing:', volunteeringsList.map(v => ({
        id: v.id, 
        isOffered: v.isOffered, 
        status: v.status,
        applicationStatus: v.applicationStatus
      })));
      
      setVolunteerings(volunteeringsList);
      setFilteredVolunteerings(volunteeringsList);
    } catch (error) {
      console.error('Error fetching volunteerings:', error);
      Alert.alert('שגיאה בטעינת ההתנדבויות');
    } finally {
      setLoading(false);
    }
  };
  
 // עדכון פונקציית handleTaskResponse לטיפול בהפחתת availableSlots
const handleTaskResponse = async (taskId, response) => {
  try {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('התחברות נדרשת', 'אנא התחבר כדי לבצע פעולה זו');
      return;
    }
    
    // עדכון מסמך ההתנדבות
    const taskRef = doc(db, 'volunteerings', taskId);
    const taskDoc = await getDoc(taskRef);
    
    if (taskDoc.exists()) {
      const taskData = taskDoc.data();
      
      if (response === 'accepted') {
        // אם המשתמש קיבל את ההצעה - עדכן סטטוס והוסף מזהה מתנדב
        
        // טיפול ב-availableSlots - המרה למספר והפחתה
        let availableSlots = parseInt(taskData.availableSlots || "0");
        if (!isNaN(availableSlots) && availableSlots > 0) {
          availableSlots -= 1;
        }
        
        await updateDoc(taskRef, {
          status: response,
          volunteerId: user.uid,
          responseDate: new Date().toISOString(),
          availableSlots: String(availableSlots) // החזרה לסטרינג
        });
      } else if (response === 'rejected') {
        // אם המשתמש דחה את ההצעה - הסר את המשתמש מרשימת ה-offeredTo
        const offeredTo = taskData.offeredTo || [];
        const updatedOfferedTo = offeredTo.filter(id => id !== user.uid);
        
        await updateDoc(taskRef, {
          offeredTo: updatedOfferedTo,
          // אם היה זה ההצעה האחרונה, החזר את הסטטוס ל-'פתוח'
          status: updatedOfferedTo.length === 0 ? 'open' : 'offered'
        });
      }
    }
    
    // עדכון פרופיל המתנדב
    const volunteerProfileRef = doc(db, 'volunteerProfiles', user.uid);
    const volunteerProfileDoc = await getDoc(volunteerProfileRef);
    
    if (volunteerProfileDoc.exists()) {
      const volunteerData = volunteerProfileDoc.data();
      const offeredTasks = volunteerData.offeredTasks || [];
      
      if (response === 'accepted') {
        // אם המשתמש קיבל את ההצעה:
        // 1. עדכן את הסטטוס ב-offeredTasks ל-'accepted'
        // 2. הוסף את המשימה ל-acceptedTasks
        const updatedOfferedTasks = offeredTasks.map(task => {
          if (task.id === taskId || task.volunteeringId === taskId) {
            return { ...task, status: response };
          }
          return task;
        });
        
        const acceptedTask = offeredTasks.find(task => 
          task.id === taskId || task.volunteeringId === taskId
        );
        
        if (acceptedTask) {
          await updateDoc(volunteerProfileRef, {
            offeredTasks: updatedOfferedTasks,
            acceptedTasks: arrayUnion({...acceptedTask, status: 'accepted'})
          });
        }
      } else if (response === 'rejected') {
        // אם המשתמש דחה את ההצעה:
        // הסר את המשימה לגמרי מ-offeredTasks
        const updatedOfferedTasks = offeredTasks.filter(task => 
          task.id !== taskId && task.volunteeringId !== taskId
        );
        
        await updateDoc(volunteerProfileRef, {
          offeredTasks: updatedOfferedTasks
        });
      }
    }
    
    // עדכון המשתנה applications במצב המקומי
    setApplications(prev => ({
      ...prev,
      [taskId]: response
    }));
    
    // עדכון המצב המקומי - וודא שכל המופעים מעודכנים
    setVolunteerings(prev => 
      prev.map(task => 
        task.id === taskId ? { 
          ...task, 
          status: response,
          // אם נדחה, גם מסמן שזה כבר לא מוצע למשתמש
          isOffered: response !== 'rejected',
          // עדכון של availableSlots במקרה של אישור
          availableSlots: response === 'accepted' ? 
            String(Math.max(0, parseInt(task.availableSlots || "0") - 1)) : 
            task.availableSlots
        } : task
      )
    );
    
    setFilteredVolunteerings(prev => 
      prev.map(task => 
        task.id === taskId ? { 
          ...task, 
          status: response,
          isOffered: response !== 'rejected',
          // עדכון של availableSlots במקרה של אישור
          availableSlots: response === 'accepted' ? 
            String(Math.max(0, parseInt(task.availableSlots || "0") - 1)) : 
            task.availableSlots
        } : task
      )
    );
    
    Alert.alert(
      response === 'accepted' ? 'המשימה אושרה' : 'המשימה נדחתה',
      response === 'accepted' ? 'המשימה נוספה למשימות שלך' : 'המשימה הוסרה מהרשימה שלך'
    );
    
  } catch (error) {
    console.error('Error updating task status:', error);
    Alert.alert('שגיאה בעדכון סטטוס המשימה');
  }
};

  const formatDate = (isoDate) => {
    if (!isoDate) return 'לא זמין';
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  const fetchLikedVolunteerings = async () => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(
        collection(db, 'likedVolunteerings'),
        where('userId', '==', user.uid)
      );
      const querySnapshot = await getDocs(q);
      const likedList = querySnapshot.docs.map((doc) => doc.data().volunteeringId);
      setLikedVolunteerings(likedList);
    } catch (error) {
      console.error('Error fetching liked volunteerings:', error);
    }
  };

  const handleLikeVolunteering = async (item) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('אנא התחבר כדי לשמור התנדבויות');
      return;
    }
  
    const likedRef = collection(db, 'likedVolunteerings');
  
    try {
      if (likedVolunteerings.includes(item.id)) {
        const querySnapshot = await getDocs(
          query(
            likedRef,
            where('userId', '==', user.uid),
            where('volunteeringId', '==', item.id)
          )
        );
        querySnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
        setLikedVolunteerings((prev) => prev.filter((id) => id !== item.id));
      } else {
        await addDoc(likedRef, {
          userId: user.uid,
          volunteeringId: item.id,
          title: item.title || '',
          description: item.description || '',
          location: item.location || '',
          date: item.date || '',
        });
        setLikedVolunteerings((prev) => [...prev, item.id]);
      }
    } catch (error) {
      console.error('Error updating liked volunteerings:', error);
      Alert.alert('שגיאה בשמירת ההתנדבויות');
    }
  };
  
  // Function to format location data
  const formatLocation = (location) => {
    if (!location) return 'לא זמין';
    // Check if location is an object with city and address
    if (typeof location === 'object' && location !== null) {
      if (location.city && location.address) {
        return `${location.city}, ${location.address}`;
      } else if (location.city) {
        return location.city;
      } else if (location.address) {
        return location.address;
      }
    }
    // If it's a string or any other format, return as is
    return String(location);
  };

  const handleSearch = (text) => {
    setSearchText(text);
    if (text.trim() === '') {
      setFilteredVolunteerings(volunteerings);
    } else if (searchType === 'location') {
      const filtered = volunteerings.filter((item) => {
        const locationStr = formatLocation(item.location);
        return locationStr.toLowerCase().includes(text.toLowerCase());
      });
      setFilteredVolunteerings(filtered);
    } else if (searchType === 'description') {
      const filtered = volunteerings.filter((item) => {
        const description = item.description || '';
        return typeof description === 'string' && 
          description.toLowerCase().includes(text.toLowerCase());
      });
      setFilteredVolunteerings(filtered);
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
  }, [translateY, buttonAnimations]);

  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        setLoading(true);
        try {
          // חשוב לטעון קודם את הבקשות ואז את ההתנדבויות כדי שנוכל לשלב את המידע
          const appsData = await fetchApplications(); 
          await fetchVolunteerings(appsData);
          await fetchLikedVolunteerings();
        } catch (error) {
          console.error('Error loading data:', error);
        } finally {
          setLoading(false);
        }
      };
      
      loadData();

      Animated.spring(searchAnimation.current, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();

      Animated.spring(heartAnimation.current, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();
      Animated.spring(editProfileAnimation.current, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }).start();
    }, [])
  );

  // Navigate to the details screen
  const navigateToDetails = (item) => {
    console.log("Navigating to details with item:", item);
    navigation.navigate('VolunteeringDetailes', { volunteering: item });
  };

  // פונקציה שמחזירה את סגנון הסטטוס לפי המצב
  const getStatusStyle = (status) => {
    switch(status) {
      case 'accepted':
        return styles.statusApproved;
      case 'rejected':
        return styles.statusRejected;
      case 'pending':
      default:
        return styles.statusPending;
    }
  };

  // פונקציה שמחזירה את טקסט הסטטוס בעברית
  const getStatusText = (status) => {
    switch(status) {
      case 'accepted':
        return 'מאושר';
      case 'rejected':
        return 'נדחה';
      case 'pending':
      default:
        return 'ממתין';
    }
  };

 const renderVolunteering = ({ item, index }) => {
  const isLiked = likedVolunteerings.includes(item.id);
  const isOffered = item.isOffered === true;
  const hasApplication = item.applicationStatus !== null && item.applicationStatus !== undefined;
  
  // בדיקה אם המקומות מלאים
  const availableSlots = parseInt(item.availableSlots || "0");
  const isFullyBooked = availableSlots <= 0;
  
  console.log('Rendering item:', item.id, 
    'isOffered:', isOffered, 
    'offered status:', item.status,
    'application status:', item.applicationStatus,
    'availableSlots:', item.availableSlots,
    'isFullyBooked:', isFullyBooked
  );
  
  if (!animationValues.current[index]) {
    animationValues.current[index] = new Animated.Value(0);
  }

  Animated.timing(animationValues.current[index], {
    toValue: 1,
    duration: 400,
    delay: index * 300,
    useNativeDriver: true,
  }).start();

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: animationValues.current[index] },
        isOffered && styles.offeredCard,
        hasApplication && styles.applicationCard,
        isFullyBooked && styles.fullyBookedCard
      ]}
    >
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigateToDetails(item)}
      >
        <View style={styles.square}>
          {isOffered && (
            <View style={styles.ribbonContainer}>
              <Text style={styles.ribbonText}>הוצע לך</Text>
            </View>
          )}
          
          {isFullyBooked && (
            <View style={styles.fullyBookedRibbon}>
              <Text style={styles.ribbonText}>תפוסה מלאה</Text>
            </View>
          )}
          
          {hasApplication && !isOffered && (
            <View style={[styles.applicationRibbon, getStatusStyle(item.applicationStatus)]}>
              <Text style={styles.ribbonText}>
                בקשתך: {getStatusText(item.applicationStatus)}
              </Text>
            </View>
          )}
          
          <Text style={[styles.squareText, { textAlign: 'left', fontWeight: 'bold' }]}>
            {item.title || 'לא זמין'}
          </Text>
          
          <Text style={[styles.squareText, { textAlign: 'left' }]}>
            {formatLocation(item.location)}
          </Text>
          
          <Text style={[styles.squareText, { textAlign: 'left' }]}>
            {formatDate(item.date)}
          </Text>
          
          
          {/* הצגת סטטוס ההצעה כשהמשימה הוצעה למשתמש */}
          {isOffered && item.status && (
            <View style={[styles.statusBadge, getStatusStyle(item.status)]}>
              <Text style={styles.statusText}>
                {getStatusText(item.status)}
              </Text>
            </View>
          )}

          {/* הצגת סטטוס בקשה שהוגשה (רק אם זו לא משימה שהוצעה למשתמש) */}
          {hasApplication && !isOffered && (
            <View style={[styles.applicationStatusBadge, getStatusStyle(item.applicationStatus)]}>
              <Text style={styles.statusText}>
                {getStatusText(item.applicationStatus)}
              </Text>
            </View>
          )}

          {/* אפשרויות קבלה או דחייה למשימות שהוצעו (רק אם יש מקומות פנויים) */}
          {isOffered === true && (!item.status || item.status === 'pending') && !isFullyBooked && (
            <View style={styles.responseButtonsContainer}>
              <TouchableOpacity 
                style={[styles.responseButton, styles.acceptButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleTaskResponse(item.id, 'accepted');
                }}
              >
                <Text style={styles.responseButtonText}>אישור</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.responseButton, styles.rejectButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleTaskResponse(item.id, 'rejected');
                }}
              >
                <Text style={styles.responseButtonText}>דחייה</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* כפתור לייק */}
          <TouchableOpacity
            style={styles.likeButton}
            onPress={(e) => {
              e.stopPropagation();
              handleLikeVolunteering(item);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={isLiked ? 'red' : 'gray'}
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};
  

  return (
    <ImageBackground
      source={require('../../assets/all2.png')}
      style={styles.backgroundImage}
    >
      <Animated.View 
        style={[
          styles.container,
          {
            transform: [
              { scale: mainContentScale },
              { translateX: mainContentTranslate }
            ]
          }
        ]}
      >
        <Animated.View
          style={[
            styles.halfCircle,
            {
              transform: [{ translateY }],
            },
          ]}
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
          התנדבות
        </Animated.Text>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

         {/* Edit Profile Button */}
         <Animated.View
          style={[
            styles.editProfileContainer,
            {
              transform: [
                {
                  translateY: editProfileAnimation.current.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={navigateToEditProfile}
            testID="editProfileButton"
          >
            <Ionicons name="pencil" size={24} color="white" />
          </TouchableOpacity>
        </Animated.View>

        <Animated.View
          style={[
            styles.searchContainer,
            {
              transform: [
                {
                  translateY: searchAnimation.current.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TextInput
            style={styles.searchInput}
            placeholder={`חפש לפי ${searchType === 'location' ? 'מיקום' : 'העדפה'}`}
            value={searchText}
            onChangeText={handleSearch}
          />
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowPicker(!showPicker)}
          >
            <Ionicons name="options-outline" size={24} color="gray" />
          </TouchableOpacity>
        </Animated.View>

        {showPicker && (
          <Picker
            selectedValue={searchType}
            onValueChange={(itemValue) => {
              setSearchType(itemValue);
              setShowPicker(false);
            }}
            style={styles.picker}
          >
            <Picker.Item label="חיפוש לפי מיקום" value="location" />
            <Picker.Item label="חיפוש לפי העדפה" value="description" />
          </Picker>
        )}

        <Animated.View
          style={[
            styles.heartContainer,
            {
              transform: [
                {
                  translateY: heartAnimation.current.interpolate({
                    inputRange: [0, 1],
                    outputRange: [100, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.icon}
            onPress={() => navigation.navigate('LikedVolunteering')}
          >
            <Ionicons name="heart" size={30} color="red" style={styles.icon} />
          </TouchableOpacity>
        </Animated.View>

        <FlatList
          data={filteredVolunteerings}
          keyExtractor={(item) => item.id}
          renderItem={renderVolunteering}
          numColumns={1}
          key="single-column"
          contentContainerStyle={{ direction: 'rtl', paddingHorizontal: 10 }}
        />

        
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
                source={require('../../assets/men.png')}
                style={styles.menuProfileImage}
              />
              <Text style={styles.menuProfileName}>שלום, {auth.currentUser?.displayName || 'משתמש'}!</Text>
              <Text style={styles.menuProfileSubtitle}>משתמש רשום</Text>
            </View>
            
            <View style={styles.menuContent}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={navigateToEditProfile}
              >
                <Text style={styles.menuTextOnly}>עריכת פרופיל מתנדב</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.menuItem}
                onPress={navigateToEmergencyContacts}
              >
                <Text style={styles.menuTextOnly}>אנשי חירום</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={navigateToLocation}
              >
                <Text style={styles.menuTextOnly}>אזורי התראה</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={navigateToAlert}
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
            
            <View style={styles.menuFooter}>
              <Text style={styles.menuFooterText}>המרחב הבטוח שלך</Text>
              <View style={styles.menuFooterDot} />
            </View>
          </Animated.View>
        </>
      )}

      <View style={styles.footer}>
        <LinearGradient
          colors={['#ff5757', '#8c52ff', '#ff5757']}
          locations={[0, 0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
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
              testID: 'likedButton'
            },
            { 
              icon: require('../../assets/mark.png'), 
              action: () => navigation.navigate('WhatToDo'),
              testID: 'whatToDoButton'
            },
            { 
              icon: require('../../assets/house.png'), 
              action: () => navigation.navigate('HomePage'),
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 50,
    direction: 'rtl',
    paddingBottom: 70,
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  backButton: {
    padding: 10,
    marginBottom: 20,
  },
  editProfileContainer: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
  },
  editProfileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8c52ff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 30,
    marginBottom: 20,
    marginTop: 75,
    backgroundColor: '#fff',
    width: '80%',
    justifyContent: 'flex-start',
    marginRight: 60,
  },
  searchInput: {
    flex: 1,
    padding: 10,
    textAlign: 'right',
  },
  fullyBookedCard: {
    // אופציונלי - סגנון מיוחד לכרטיסים עם תפוסה מלאה
    opacity: 0.8,
  },
  
  fullyBookedRibbon: {
    position: 'absolute',
    bottom: 10,  // שינוי מ-top ל-bottom
    left: 3,
    backgroundColor: '#ff3b30', // אדום בולט
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius:10,
    zIndex: 10,
  },
  heartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 30,
    marginBottom: 20,
    marginTop: -69,
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    justifyContent: 'center',
    marginLeft: 4,
    zIndex: 10,
  },
  pickerButton: {
    padding: 10,
  },
  picker: {
    marginBottom: -70,
    marginTop: -60,
  },
  card: {
    flex: 1,
    marginRight:-2,
    marginHorizontal: 5,
    marginVertical: 5,
    width: '100%',
  },
  icon: {
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  square: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 15,
    width: '100%',
    height: 180,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    margin: 5,
    elevation: 5,
    shadowColor: '#a6a6a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    position: 'relative',
  },
  squareText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'left',
    marginBottom: 8,
    width: '100%',
  },
  offeredCard: {
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  
  ribbonContainer: {
    position: 'absolute',
    top: 10,
    left: 45,
    backgroundColor: '#2c6975',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  ribbonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  responseButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 5,
  },
  responseButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: '#27ae60',
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  responseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
   applicationCard: {
    borderWidth: 2,
    borderColor: 'transparent', // צבע כחול לבקשות שהוגשו
  },
  applicationRibbon: {
    position: 'absolute',
    top: 0,
    right: 220,
    backgroundColor: '#3498db',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
    zIndex: 5,
  },
  applicationStatusBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 1,
  },
  //Status styles
  statusApproved: {
    backgroundColor: '#27ae60',
  },
  statusRejected: {
    backgroundColor: '#e74c3c',
  },
  statusPending: {
    backgroundColor: '#f39c12',
  },
  statusBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
    zIndex: 1,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  likeButton: {
    position: 'absolute',
    top: 15,
    left: 15,
    zIndex: 2,
  },
  // סגנון חדש עבור תגית הסטטוס
  statusBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  // סגנונות לפי סטטוס
  statusPending: {
    backgroundColor: '#777777', // אפור
  },
  statusApproved: {
    backgroundColor: '#4CAF50', // ירוק
  },
  statusRejected: {
    backgroundColor: '#F44336', // אדום
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
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
    marginRight: 20,
    marginTop: -40,
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundColor: '#c254af',
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
  menuTextOnly: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c6975',
    textAlign: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 10,
    marginHorizontal: 20,
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
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export default AllVolunteerings;




