import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ImageBackground,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
  Switch,
} from 'react-native';
import { LogBox } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc, getDoc } from '@firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth'; 



const VolunteerProfileScreen = ({ route, navigation }) => {
  const { userId } = route.params;
  
  // ייבוא ישיר של Firestore
  const db = getFirestore();
  const auth = getAuth();
  
  // פרטים בסיסיים 
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // פרטי פרופיל מתנדב
  const [skills, setSkills] = useState('');
  const [experience, setExperience] = useState('');
  const [availability, setAvailability] = useState('');
  const [mobilityOptions, setMobilityOptions] = useState('');
  const [languages, setLanguages] = useState('');
  const [certifications, setCertifications] = useState('');
  const [motivation, setMotivation] = useState('');
  const [limitations, setLimitations] = useState('');
  const [profilePicture, setProfilePicture] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedAvailability, setSelectedAvailability] = useState([]);
  const [hasCar, setHasCar] = useState(false);
  // הוספת משתנה לדירוג כוכבים
  const [rating, setRating] = useState(0);
  // להסתיר את כל השגיאות וההתראות
LogBox.ignoreAllLogs();

// או להסתיר רק שגיאות ספציפיות
LogBox.ignoreLogs(['NOBRIDGE']);
  
  const availabilityOptions = [
    'ימי ראשון',
    'ימי שני',
    'ימי שלישי',
    'ימי רביעי',
    'ימי חמישי',
    'ימי שישי',
    'ימי שבת',
  ];

  // אנימציות
  const logoAnimation = useRef(new Animated.Value(0)).current;
  const logoContainerAnimation = useRef(new Animated.Value(-100)).current;
  const formContainerAnimation = useRef(new Animated.Value(100)).current;
  const footerAnimation = useRef(new Animated.Value(100)).current;
  const titleAnimation = useRef(new Animated.Value(100)).current;

  // קומפוננטת כוכב
  const StarRating = ({ rating }) => {
    return (
      <View style={styles.starContainer}>
        <Text style={styles.ratingText}>דירוג המתנדב: </Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= rating ? "star" : "star-outline"}
              size={24}
              color={star <= rating ? "#FFD700" : "#BDC3C7"}
              style={styles.starIcon}
            />
          ))}
        </View>
      </View>
    );
  };

  // טעינת מידע משתמש קיים
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        console.log("Fetching user data for:", userId); // לוג לדיבוג

        // בדיקה שיש לנו userId תקין
        if (!userId) {
          console.error("No valid user ID");
          setLoading(false);
          return;
        }
        
        // שינוי: השתמש בuserId ישירות
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
          console.log("User data found:", userDoc.data());
          setUserData(userDoc.data());
        } else {
          console.log("No user document found!");
        }
        
        // בדיקה אם יש כבר פרופיל מתנדב
        const volunteerProfileRef = doc(db, 'volunteerProfiles', userId);
        const volunteerProfileDoc = await getDoc(volunteerProfileRef);
        
        if (volunteerProfileDoc.exists()) {
          const profileData = volunteerProfileDoc.data();
          console.log("Volunteer profile found:", profileData);
          
          // שאר הקוד זהה...
          setSkills(profileData.skills || '');
          setExperience(profileData.experience || '');
          setAvailability(profileData.availability || '');
          setSelectedAvailability(profileData.selectedAvailability || []);
          setMobilityOptions(profileData.mobilityOptions || '');
          setLanguages(profileData.languages || '');
          setCertifications(profileData.certifications || '');
          setMotivation(profileData.motivation || '');
          setLimitations(profileData.limitations || '');
          setProfilePicture(profileData.profilePicture || null);
          setHasCar(profileData.hasCar || false);
          // שמירת דירוג מהמסד נתונים
          setRating(profileData.rating || 0);
        } else {
          console.log("No volunteer profile found - new user");
          // דירוג לפרופיל חדש מתחיל ב-0
          setRating(0);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user data:", error.message, error.stack);
        alert(`שגיאה בטעינת נתונים: ${error.message}`);
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [userId, db]);

  // שמירת פרופיל המתנדב
  // שמירת פרופיל המתנדב עם טיפול משופר בתמונות
const saveVolunteerProfile = async () => {
  try {
    // בדיקת תקינות userId
    if (!userId) {
      alert('אין מידע תקין על המשתמש');
      return;
    }
    
    let profilePictureUrl = profilePicture;
    
    // העלאת תמונת פרופיל לאחסון במידה וקיימת
    if (profilePicture && (profilePicture.startsWith('file:') || profilePicture.startsWith('content:'))) {
      console.log("Uploading profile picture:", profilePicture);
      
      try {
        const storage = getStorage();
        const imageRef = ref(storage, `profilePictures/${userId}`);
        
        // שיפור תהליך המרת התמונה ל-blob
        const response = await fetch(profilePicture);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }
        
        const blob = await response.blob();
        console.log("Image blob created, size:", blob.size);
        
        if (blob.size === 0) {
          throw new Error("Image blob is empty");
        }
        
        // העלאת התמונה לפיירבייס בתצורה משופרת
        const uploadResult = await uploadBytes(imageRef, blob);
        console.log("Upload successful:", uploadResult);
        
        // קבלת ה-URL של התמונה שהועלתה
        profilePictureUrl = await getDownloadURL(imageRef);
        console.log("Image URL obtained:", profilePictureUrl);
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
        // ממשיך לשמור את שאר הפרופיל גם אם יש בעיה בתמונה
      }
    } else if (profilePicture) {
      console.log("Using existing profile picture URL:", profilePicture);
    } else {
      console.log("No profile picture to upload");
    }
    
    const volunteerProfileData = {
      userId: userId,
      skills,
      experience,
      availability: selectedAvailability.join(', '),
      selectedAvailability,
      hasCar,
      mobilityOptions,
      languages,
      certifications,
      motivation,
      limitations,
      profilePicture: profilePictureUrl,
      // הוספת/שמירת דירוג
      rating: rating,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    console.log("Saving profile data with picture URL:", profilePictureUrl);
    
    // שמירת פרופיל המתנדב
    const volunteerProfileRef = doc(db, 'volunteerProfiles', userId);
    await setDoc(volunteerProfileRef, volunteerProfileData);
    
    alert('פרופיל המתנדב נשמר בהצלחה!');
    navigation.navigate('HomePage');
  } catch (error) {
    console.error('Error saving volunteer profile:', error.message, error.stack);
    alert(`שגיאה בשמירת פרופיל המתנדב: ${error.message}`);
  }
};
  

  // אנימציות
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(logoAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(logoAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // אנימציה להופעת הקונטיינרים
    Animated.parallel([
      Animated.timing(logoContainerAnimation, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(formContainerAnimation, {
        toValue: 0,
        duration: 1400,
        useNativeDriver: true,
      }),
      Animated.timing(footerAnimation, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(titleAnimation, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoAnimation]);

  const opacity = logoAnimation.interpolate({
    inputRange: [0.01, 1],
    outputRange: [0.5, 1], // הבהוב קל
  });

  // בחירת תמונת פרופיל
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        alert('נדרשת הרשאה לגישה לגלריה כדי לבחור תמונת פרופיל');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImageUri = result.assets[0].uri;
        console.log("Selected image URI:", selectedImageUri);
        setProfilePicture(selectedImageUri);
      } else {
        console.log("Image selection canceled or no assets returned");
      }
    } catch (error) {
      console.error("Error picking image:", error);
      alert(`שגיאה בבחירת תמונה: ${error.message}`);
    }
  };

  // טוגל בחירת זמינות
  const toggleAvailability = (option) => {
    if (selectedAvailability.includes(option)) {
      setSelectedAvailability(selectedAvailability.filter(item => item !== option));
    } else {
      setSelectedAvailability([...selectedAvailability, option]);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>טוען...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/start.png')}
      style={styles.backgroundImage}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        
      >
       
        {/* כותרת פרופיל מתנדב */}
        <Animated.Text
          style={[
            styles.title,
            { transform: [{ translateY: titleAnimation }] },
          ]}
        >
          
          פרופיל מתנדב
        </Animated.Text>
      
        {/* לוגו מחוץ ל-ScrollView */}
        
        <Animated.View
          style={[
            styles.formContainer,
            { transform: [{ translateY: formContainerAnimation }] },
          ]}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {/* תמונת פרופיל */}
            <View style={styles.profilePictureContainer}>
              <TouchableOpacity onPress={pickImage}>
                {profilePicture ? (
                  <Image source={{ uri: profilePicture }} style={styles.profilePicture} />
                ) : (
                  <View style={styles.profilePicturePlaceholder}>
                    <Text style={styles.profilePicturePlaceholderText}>+</Text>
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.profilePictureText}>תמונת פרופיל</Text>
            </View>

          

            {/* מיומנויות וכישורים */}
            <TextInput
              style={styles.input}
              value={skills}
              onChangeText={setSkills}
              placeholder="מיומנויות וכישורים (תוכנה, הדרכה, טיפול וכו')"
              placeholderTextColor="#7f8c8d"
              multiline
            />

            {/* ניסיון קודם בהתנדבות */}
            <TextInput
              style={styles.input}
              value={experience}
              onChangeText={setExperience}
              placeholder="ניסיון קודם בהתנדבות"
              placeholderTextColor="#7f8c8d"
              multiline
            />

            {/* זמינות */}
            <TouchableOpacity onPress={() => setIsModalVisible(true)}>
              <Text style={styles.input}>
                {selectedAvailability.length > 0 ? `נבחרו ${selectedAvailability.length} זמני זמינות` : 'בחר זמני זמינות להתנדבות'}
              </Text>
            </TouchableOpacity>

            {/* מודאל זמינות */}
            <Modal
              visible={isModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setIsModalVisible(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalText}>בחר זמני זמינות</Text>
                  <ScrollView style={styles.modalScrollView}>
                    {availabilityOptions.map((option, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.availabilityOption}
                        onPress={() => toggleAvailability(option)}
                      >
                        <View style={styles.checkboxContainer}>
                          <View style={[
                            styles.checkbox,
                            selectedAvailability.includes(option) && styles.checkboxSelected
                          ]}>
                            {selectedAvailability.includes(option) && (
                              <Text style={styles.checkmark}>✓</Text>
                            )}
                          </View>
                          <Text style={styles.modalOption}>{option}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.closeModalButton}
                    onPress={() => setIsModalVisible(false)}
                  >
                    <Text style={styles.closeModalButtonText}>אישור</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            {/* האם יש רכב */}
            <View style={styles.switchContainer}>
              <Text style={styles.label}>האם יש לך רכב?</Text>
              <Switch
                value={hasCar}
                onValueChange={setHasCar}
              />
            </View>

            {/* אפשרויות ניידות */}
            <TextInput
              style={styles.input}
              value={mobilityOptions}
              onChangeText={setMobilityOptions}
              placeholder="אפשרויות ניידות (עד כמה רחוק תוכל להתנדב)"
              placeholderTextColor="#7f8c8d"
            />

            {/* שפות */}
            <TextInput
              style={styles.input}
              value={languages}
              onChangeText={setLanguages}
              placeholder="שפות שאתה דובר"
              placeholderTextColor="#7f8c8d"
            />

            {/* הכשרות והסמכות */}
            <TextInput
              style={styles.input}
              value={certifications}
              onChangeText={setCertifications}
              placeholder="הכשרות והסמכות רלוונטיות"
              placeholderTextColor="#7f8c8d"
              multiline
            />

            {/* מוטיבציה להתנדבות */}
            <TextInput
              style={styles.textArea}
              value={motivation}
              onChangeText={setMotivation}
              placeholder="מוטיבציה להתנדבות - מדוע אתה רוצה להתנדב?"
              placeholderTextColor="#7f8c8d"
              multiline
              numberOfLines={4}
            />

            {/* מגבלות */}
            <TextInput
              style={styles.input}
              value={limitations}
              onChangeText={setLimitations}
              placeholder="מגבלות פיזיות או אחרות שיש לקחת בחשבון"
              placeholderTextColor="#7f8c8d"
              multiline
            />
          </ScrollView>
        </Animated.View>

        <Animated.View
          style={[
            styles.footer,
            { transform: [{ translateY: footerAnimation }] },
          ]}
        >
          <TouchableOpacity style={styles.button} onPress={saveVolunteerProfile}>
            <Text style={styles.buttonText}>שמור פרופיל</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.toggleText}>
              חזור
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </ImageBackground>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#34495e',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 100,
    marginBottom:-40,
    textAlign: 'center',
  },
  formContainer: {
    flex: 2,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 40,
    paddingTop: 15,
    paddingBottom: 15,
    marginTop: 90,
  },
  scrollContainer: {
    paddingBottom: 10,
  },
  scrollView: {
    paddingTop: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 2,
  },
  logoBackground: {
    width: 150,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
    marginTop: 10,
    marginBottom: 5,
  },
  logoInContainer: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
    backgroundColor: 'transparent',
    marginTop: -20,
  },
  profilePictureContainer: {
    alignItems: 'center',
    marginVertical: 15,
  },
  profilePicture: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#2c6975',
  },
  profilePicturePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2c6975',
  },
  profilePicturePlaceholderText: {
    fontSize: 40,
    color: '#7f8c8d',
  },
  profilePictureText: {
    marginTop: 8,
    fontSize: 16,
    color: '#34495e',
  },
  input: {
    width: '80%',
    marginLeft: 40,
    textAlign: 'right',
    padding: 10,
    marginVertical: 10,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderColor: '#bdc3c7',
    fontSize: 16,
    color: '#34495e',
  },
  textArea: {
    width: '80%',
    marginLeft: 40,
    textAlign: 'right',
    padding: 10,
    marginVertical: 10,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 10,
    fontSize: 16,
    color: '#34495e',
    minHeight: 100,
  },
  backButton: {
    position: 'absolute',
    left: 0,
  },
  button: {
    width: 200,
    paddingVertical: 15,
    backgroundColor: '#2c6975',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  toggleText: {
    color: '#7f8c8d',
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  footer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
    paddingHorizontal: 40,
    width: '100%',
  },
  label: {
    fontSize: 16,
    color: '#34495e',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    writingDirection: 'rtl',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 40,
    writingDirection: 'rtl',
    width: '80%',
    maxHeight: '70%',
    elevation: 5,
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalText: {
    fontSize: 18,
    marginBottom: 15,
    textAlign: 'right',
    color: '#34495e',
    fontWeight: 'bold',
  },
  modalOption: {
    fontSize: 16,
    color: '#34495e',
    textAlign: 'right',
  },
  availabilityOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#bdc3c7',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#2c6975',
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2c6975',
  },
  checkmark: {
    color: 'white',
    fontWeight: 'bold',
  },
  closeModalButton: {
    marginTop: 20,
    backgroundColor: '#2c6975',
    padding: 15,
    borderRadius: 50,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  starContainer: {
    alignItems: 'center',
    marginVertical: 10,
  },
  ratingText: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 5,
  },
  starsRow: {
    flexDirection: 'row',
  },
  starIcon: {
    marginHorizontal: 2,
  }
});

export default VolunteerProfileScreen;
