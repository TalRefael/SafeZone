import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  I18nManager,
  Dimensions,
  Animated,
  Alert,
  Pressable,
} from 'react-native';
import { collection, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// קבלת מידות המסך
const { width, height } = Dimensions.get('window');

// קומפוננטת כוכב
const StarRating = ({ rating }) => {
  return (
    <View style={styles.starContainer}>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons
            key={star}
            name={star <= rating ? "star" : "star-outline"}
            size={16}
            color={star <= rating ? "#FFD700" : "#BDC3C7"}
            style={styles.starIcon}
          />
        ))}
      </View>
    </View>
  );
};

const VolunteersListScreen = ({ navigation }) => {
  const [volunteers, setVolunteers] = useState([]);
  const [filteredVolunteers, setFilteredVolunteers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [userId, setUserId] = useState('');
  const slideAnim = useRef(new Animated.Value(280)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const mainContentScale = useRef(new Animated.Value(1)).current;
  const mainContentTranslate = useRef(new Animated.Value(0)).current;
  
  // אנימציה למעגל של הרקע
  const translateY = useRef(new Animated.Value(-1000)).current;
  const titleAnimation = useRef(new Animated.Value(0)).current;
  
  // מצב הפילטר
  const [filters, setFilters] = useState({
    days: {
      'ימי ראשון': false,
      'ימי שני': false,
      'ימי שלישי': false,
      'ימי רביעי': false,
      'ימי חמישי': false,
      'ימי שישי': false,
      'ימי שבת': false,
    },
    hasCar: null, // null = שניהם, true = יש רכב, false = אין רכב
    languages: [],
    searchLanguage: '',
  });

  const db = getFirestore();
  const auth = getAuth();

  // טעינת המתנדבים בעת טעינת המסך
  useEffect(() => {
    fetchVolunteers();
    
    // הפעלת אנימציה של הרקע
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
    
  }, []);

  // החל פילטרים בכל שינוי של הפילטרים או חיפוש טקסט
  useEffect(() => {
    applyFilters();
  }, [volunteers, filters, searchText]);

  // Modify the useEffect for fetching user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const auth = getAuth();
        const currentUser = auth.currentUser;

        if (!currentUser) {
          console.error('No user is currently signed in.');
          setFirstName('משתמש');
          return;
        }

        const currentUserId = currentUser.uid;
        setUserId(currentUserId); // Set the userId state
        const db = getFirestore();
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

  // פונקציה להביא את כל המתנדבים מבסיס הנתונים ולהביא את השמות המלאים שלהם
  const fetchVolunteers = async () => {
    try {
      setLoading(true);
      const volunteerProfilesRef = collection(db, 'volunteerProfiles');
      const querySnapshot = await getDocs(volunteerProfilesRef);
      
      const volunteersData = [];
      
      // קבלת הנתונים של כל מתנדב
      for (const volunteerDoc of querySnapshot.docs) {
        const data = volunteerDoc.data();
        
        // אם יש userId, נסה להביא את השם המלא מהמשתמש
        let fullName = 'מתנדב/ת';
        if (data.userId) {
          try {
            const userRef = doc(db, 'users', data.userId);
            const userDoc = await getDoc(userRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              // אם יש שם מלא, השתמש בו
              if (userData.fullName) {
                fullName = userData.fullName;
              } else if (userData.firstName && userData.lastName) {
                fullName = `${userData.firstName} ${userData.lastName}`;
              } else if (userData.firstName) {
                fullName = userData.firstName;
              } else if (userData.displayName) {
                fullName = userData.displayName;
              }
            }
          } catch (error) {
            console.error('Error fetching user data:', error);
          }
        }
        
        volunteersData.push({
          id: volunteerDoc.id,
          ...data,
          fullName, // הוספת השם המלא
          // וודא שיש רשימת ימים ושפות, אפילו אם הם ריקים
          selectedAvailability: data.selectedAvailability || [],
          languages: data.languages || '',
          rating: data.rating || 0, // הוספת דירוג, אם אין אז 0
        });
      }
      
      setVolunteers(volunteersData);
      setFilteredVolunteers(volunteersData);
    } catch (error) {
      console.error('Error fetching volunteers:', error);
      alert('שגיאה בטעינת רשימת המתנדבים: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // החלת הפילטרים על רשימת המתנדבים
  const applyFilters = () => {
    // אם אין מתנדבים, אין מה לפלטר
    if (!volunteers.length) return;
    
    let result = [...volunteers];
    
    // פילטור לפי טקסט חיפוש
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(volunteer => 
        (volunteer.fullName && volunteer.fullName.toLowerCase().includes(searchLower)) || // חיפוש גם בשם המלא
        (volunteer.skills && volunteer.skills.toLowerCase().includes(searchLower)) ||
        (volunteer.experience && volunteer.experience.toLowerCase().includes(searchLower)) ||
        (volunteer.languages && volunteer.languages.toLowerCase().includes(searchLower)) ||
        (volunteer.motivation && volunteer.motivation.toLowerCase().includes(searchLower))
      );
    }
    
    // פילטור לפי ימים נבחרים
    const selectedDays = Object.keys(filters.days).filter(day => filters.days[day]);
    if (selectedDays.length > 0) {
      result = result.filter(volunteer => {
        // אם אין רשימת ימים זמינים, לא מתאים לפילטור
        if (!volunteer.selectedAvailability || !volunteer.selectedAvailability.length) return false;
        
        // בדוק אם יש לפחות יום אחד שמתאים לפילטור
        return selectedDays.some(day => volunteer.selectedAvailability.includes(day));
      });
    }
    
    // פילטור לפי רכב
    if (filters.hasCar !== null) {
      result = result.filter(volunteer => volunteer.hasCar === filters.hasCar);
    }
    
    // פילטור לפי שפות
    if (filters.languages.length > 0) {
      result = result.filter(volunteer => {
        if (!volunteer.languages) return false;
        const volunteerLanguagesLower = volunteer.languages.toLowerCase();
        return filters.languages.some(lang => 
          volunteerLanguagesLower.includes(lang.toLowerCase())
        );
      });
    }
    
    setFilteredVolunteers(result);
  };

  // טוגל ליום בפילטר
  const toggleDayFilter = (day) => {
    setFilters(prev => ({
      ...prev,
      days: {
        ...prev.days,
        [day]: !prev.days[day]
      }
    }));
  };

  // הוספת שפה לפילטר
  const addLanguageFilter = () => {
    if (!filters.searchLanguage.trim()) return;
    
    if (!filters.languages.includes(filters.searchLanguage.trim())) {
      setFilters(prev => ({
        ...prev,
        languages: [...prev.languages, filters.searchLanguage.trim()],
        searchLanguage: ''
      }));
    } else {
      setFilters(prev => ({
        ...prev,
        searchLanguage: ''
      }));
    }
  };

  // הסרת שפה מהפילטר
  const removeLanguageFilter = (language) => {
    setFilters(prev => ({
      ...prev,
      languages: prev.languages.filter(lang => lang !== language)
    }));
  };

  // איפוס פילטרים
  const resetFilters = () => {
    setFilters({
      days: {
        'ימי ראשון': false,
        'ימי שני': false,
        'ימי שלישי': false,
        'ימי רביעי': false,
        'ימי חמישי': false,
        'ימי שישי': false,
        'ימי שבת': false,
      },
      hasCar: null,
      languages: [],
      searchLanguage: '',
    });
    setSearchText('');
  };

  // רינדור פריט מתנדב ברשימה
  const renderVolunteerItem = ({ item }) => {
    // תמונת ברירת מחדל אם אין תמונת פרופיל
    const profileImage = item.profilePicture 
      ? { uri: item.profilePicture } 
      : require('../../assets/men.png');
      
    return (
      <TouchableOpacity 
        style={styles.volunteerCard}
        onPress={() => navigation.navigate('VolunteerDetailsScreen', { volunteerId: item.id })}
      >
        <View style={styles.volunteerInfo}>
          <View style={styles.volunteerMainInfo}>
            <View style={styles.volunteerTextInfo}>
              <Text style={styles.volunteerName}>{item.fullName}</Text>
              <Text style={styles.volunteerSkills} numberOfLines={2}>{item.skills || 'אין מיומנויות'}</Text>
              {/* הוספת קומפוננטת הדירוג */}
              <StarRating rating={item.rating || 0} />
            </View>
            <Image source={profileImage} style={styles.profileImage} />
          </View>
          
          <View style={styles.volunteerDetails}>
            {/* זמינות */}
            <View style={styles.detailRow}>
              <Text style={styles.detailValue} numberOfLines={1}>
                {item.selectedAvailability && item.selectedAvailability.length > 0 
                  ? `${item.selectedAvailability.length} ימים` 
                  : 'לא צוין'}
              </Text>
              <Text style={styles.detailLabel}>זמינות:</Text>
            </View>
            
            {/* רכב */}
            <View style={styles.detailRow}>
              <Text style={styles.detailValue}>
                {item.hasCar ? 'יש' : 'אין'}
              </Text>
              <Text style={styles.detailLabel}>רכב:</Text>
            </View>
            
            {/* שפות */}
            <View style={styles.detailRow}>
              <Text style={styles.detailValue} numberOfLines={1}>
                {item.languages || 'לא צוין'}
              </Text>
              <Text style={styles.detailLabel}>שפות:</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // רינדור מספר המתנדבים שנמצאו
  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.resultCount}>
        נמצאו {filteredVolunteers.length} מתנדבים
      </Text>
    </View>
  );

  const handleLogout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      // Clear any local state
      setVolunteers([]);
      setFilteredVolunteers([]);
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
        {/* רקע גרדיאנט חדש */}
        <Animated.View
          style={[
            styles.halfCircle,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <LinearGradient
            colors={['#cdffd8', '#94b9ff', '#cdffd8']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          />
        </Animated.View>

        {/* כותרת עם אנימציה */}
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
          רשימת מתנדבים
        </Animated.Text>
        
        {/* כותרת */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* תיבת חיפוש */}
        <View style={styles.searchContainer}>
          <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
            <Ionicons name="filter" size={24} color="#94b9ff" />
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="חיפוש מתנדבים..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#7f8c8d"
          />
        </View>
        
        {/* רשימת המתנדבים המסוננת */}
        {loading ? (
          <ActivityIndicator size="large" color="#2c6975" style={styles.loader} />
        ) : (
          <FlatList
            data={filteredVolunteers}
            renderItem={renderVolunteerItem}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={styles.emptyText}>לא נמצאו מתנדבים העונים לקריטריונים</Text>
              </View>
            }
          />
        )}

        {/* Footer Navigation */}
        <View style={styles.footer}>
          <LinearGradient
            colors={['#cdffd8', '#94b9ff', '#cdffd8']}
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
                testID: 'heartButton'
              },
              { 
                icon: require('../../assets/house.png'), 
                action: () => navigation.navigate('HomePage_organ'),
                testID: 'homeButton'
              },
            ].map((item, index) => (
              <TouchableOpacity 
                key={index}
                onPress={item.action} 
                style={styles.footerButton}
                activeOpacity={0.7}
                testID={item.testID}
              >
                <Image source={item.icon} style={styles.footerIcon} />
              </TouchableOpacity>
            ))}
          </LinearGradient>
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
      
      {/* מודאל פילטרים */}
      <Modal
        visible={filterModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>סינון מתנדבים</Text>
            
            <ScrollView style={styles.filtersContainer}>
              {/* פילטר ימים */}
              <Text style={styles.filterSectionTitle}>ימי זמינות</Text>
              <View style={styles.daysContainer}>
                {Object.keys(filters.days).map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayButton,
                      filters.days[day] && styles.dayButtonSelected
                    ]}
                    onPress={() => toggleDayFilter(day)}
                  >
                    <Text 
                      style={[
                        styles.dayButtonText,
                        filters.days[day] && styles.dayButtonTextSelected
                      ]}
                    >
                      {day.replace('ימי ', '')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* פילטר רכב */}
              <Text style={styles.filterSectionTitle}>רכב</Text>
              <View style={styles.carFilterContainer}>
                <TouchableOpacity
                  style={[
                    styles.carButton,
                    filters.hasCar === true && styles.dayButtonSelected
                  ]}
                  onPress={() => setFilters(prev => ({
                    ...prev,
                    hasCar: prev.hasCar === true ? null : true
                  }))}
                >
                  <Text 
                    style={[
                      styles.carButtonText,
                      filters.hasCar === true && styles.dayButtonTextSelected
                    ]}
                  >
                    יש רכב
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.carButton,
                    filters.hasCar === false && styles.dayButtonSelected
                  ]}
                  onPress={() => setFilters(prev => ({
                    ...prev,
                    hasCar: prev.hasCar === false ? null : false
                  }))}
                >
                  <Text 
                    style={[
                      styles.carButtonText,
                      filters.hasCar === false && styles.dayButtonTextSelected
                    ]}
                  >
                    אין רכב
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* פילטר שפות */}
              <Text style={styles.filterSectionTitle}>שפות</Text>
              <View style={styles.languageInputContainer}>
                <TouchableOpacity style={styles.addLanguageButton} onPress={addLanguageFilter}>
                  <Text style={styles.addLanguageButtonText}>+</Text>
                </TouchableOpacity>
                <TextInput
                  style={styles.languageInput}
                  placeholder="הוסף שפה"
                  value={filters.searchLanguage}
                  onChangeText={text => setFilters(prev => ({ ...prev, searchLanguage: text }))}
                  onSubmitEditing={addLanguageFilter}
                  textAlign="right"
                />
              </View>
              
              {/* שפות שנבחרו */}
              {filters.languages.length > 0 && (
                <View style={styles.selectedLanguagesContainer}>
                  {filters.languages.map((language) => (
                    <View key={language} style={styles.languageTag}>
                      <TouchableOpacity onPress={() => removeLanguageFilter(language)}>
                        <Ionicons name="close-circle" size={16} color="#fff" />
                      </TouchableOpacity>
                      <Text style={styles.languageTagText}>{language}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            
            {/* כפתורי הפעולה */}
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.resetButton]} 
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>אפס פילטרים</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={() => {
                  applyFilters();
                  setFilterModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>החל פילטרים</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingBottom: 0,
  },
  // סגנונות חדשים לרקע גרדיאנט
  halfCircle: {
    position: 'absolute',
    top: 0,
    left: width / 2 - 500,
    width: 1000,
    height: 1000,
    borderRadius: 500,
    overflow: 'hidden',
    zIndex: -1,
  },
  gradient: {
    flex: 1,
  },
  circleTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    position: 'absolute',
    top: 80,
    width: '100%',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 70,
    position: 'relative',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 0,
    marginTop: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 20,
    marginTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    height: 40,
    padding: 8,
    textAlign: 'right',
    color: '#34495e',
    fontWeight: '500',
  },
  filterButton: {
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  list: {
    paddingBottom: 80,
  },
  listHeader: {
    padding: 10,
    backgroundColor: 'rgba(44, 105, 117, 0.1)',
    borderRadius: 10,
    marginBottom: 10,
  },
  resultCount: {
    color: '#2c6975',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  volunteerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  volunteerInfo: {
    flex: 1,
  },
  volunteerMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'flex-end',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    marginLeft: 15,
  },
  volunteerTextInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  volunteerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#94b9ff',
    marginBottom: 5,
    textAlign: 'right',
  },
  volunteerSkills: {
    fontSize: 14,
    color: '#34495e',
    textAlign: 'right',
    marginBottom: 5,
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  ratingText: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 8,
  },
  starsRow: {
    flexDirection: 'row',
  },
  starIcon: {
    marginHorizontal: 1,
  },
  volunteerDetails: {
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
    paddingTop: 10,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 14,
    color: '#7f8c8d',
    marginRight: 8,
  },
  detailValue: {
    fontSize: 14,
    color: '#34495e',
    fontWeight: '500',
    textAlign: 'right',
    maxWidth: '70%',
  },
  emptyList: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#7f8c8d',
    fontSize: 16,
    textAlign: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c6975',
    marginBottom: 20,
    textAlign: 'center',
  },
  filtersContainer: {
    maxHeight: 400,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'right',
  },
  daysContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    marginLeft: 8,
    marginBottom: 8,
  },
  dayButtonSelected: {
    backgroundColor: '#94b9ff',
    borderColor: '#94b9ff',
  },
  dayButtonText: {
    color: '#34495e',
    fontSize: 14,
  },
  dayButtonTextSelected: {
    color: 'white',
  },
  carFilterContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  carButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    marginLeft: 10,
  },
  carButtonText: {
    color: '#34495e',
    fontSize: 14,
  },
  languageInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  languageInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 20,
    paddingHorizontal: 15,
    textAlign: 'right',
  },
  addLanguageButton: {
    backgroundColor: '#94b9ff',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  addLanguageButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  selectedLanguagesContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 15,
  },
  languageTag: {
    flexDirection: 'row-reverse',
    backgroundColor: '#94b9ff',
    borderRadius: 15,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginLeft: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  languageTagText: {
    color: 'white',
    marginLeft: 5,
  },
  modalActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#94b9ff',
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resetButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#94b9ff',
  },
  resetButtonText: {
    color: '#94b9ff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0, // זה חשוב - מבטיח שהפוטר יתפוס את כל הרוחב
    height: 70,
    overflow: 'hidden',
    width: Dimensions.get('window').width, // הוספה נוספת לוודא רוחב מלא
  },

  footerGradient: {
    flex: 1,
    flexDirection: 'row-reverse',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
    width: '100%', // וודא שהגרדיאנט תופס את כל הרוחב
  },
  footerButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerIcon: {
    width: 30,
    height: 30,
  },
  mainContentContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    paddingHorizontal: 16, // רק מהצדדים
    paddingTop: 16,        // רק מלמעלה
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
    backgroundColor: '#b3dfea',
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

export default VolunteersListScreen;