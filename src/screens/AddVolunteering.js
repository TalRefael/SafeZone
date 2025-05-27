import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ImageBackground, Animated, Platform, KeyboardAvoidingView, Modal, I18nManager, Dimensions } from 'react-native';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const AddVolunteering = ({ navigation }) => {
  const [title, setTitle] = useState('');
  const [shortDescription, setShortDescription] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [volunteeringType, setVolunteeringType] = useState('');
  const [location, setLocation] = useState({ city: '', address: '' });
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState('');
  const [prerequisites, setPrerequisites] = useState('');
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [availableSlots, setAvailableSlots] = useState('');
  const [isAccessible, setIsAccessible] = useState(false);
  const [registrationMethod, setRegistrationMethod] = useState('');
  const [loading, setLoading] = useState(false);
  
  // For dropdown menus
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [showDurationDropdown, setShowDurationDropdown] = useState(false);
  
  // Dropdown options
  const volunteeringTypeOptions = [
    'חד פעמי',
    'כל יום',
    'פעם בשבוע',
    'פעמיים בשבוע',
    'פעם בשבועיים',
    'פעם בחודש',
    'אחר'
  ];
  
  const durationOptions = [
    'שעה',
    'שעתיים',
    'שלוש שעות',
    '4 שעות',
    '5 שעות פלוס',
    'יום שלם',
    'אחר'
  ];
  
  const db = getFirestore();
  const auth = getAuth();
  const formAnimation = useRef(new Animated.Value(200)).current;
  const translateY = useRef(new Animated.Value(-1000)).current;
  const titleAnimation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            
            if (userData.organizationName) {
              setTitle(userData.organizationName);
            }
            
            if (userData.firstName && userData.lastName) {
              setContact(prevContact => ({
                ...prevContact,
                name: `${userData.firstName} ${userData.lastName}`
              }));
            }
            
            if (userData.phone) {
              setContact(prevContact => ({
                ...prevContact,
                phone: userData.phone
              }));
            }
            
            // מילוי אוטומטי של המייל מנתוני המשתמש
            if (user.email) {
              setContact(prevContact => ({
                ...prevContact,
                email: user.email
              }));
            } else if (userData.email) {
              setContact(prevContact => ({
                ...prevContact,
                email: userData.email
              }));
            }
          }
        }
      } catch (error) {
        console.error('שגיאה בטעינת נתוני משתמש:', error);
      }
    };
    
    fetchUserData();
    
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
  }, [translateY]);
  
  const validateForm = () => {
    let errors = [];
    
    // בדיקת כל השדות המסומנים בכוכבית
    if (!title.trim()) errors.push("שם ההתנדבות");
    if (!shortDescription.trim()) errors.push("תיאור קצר");
    if (!volunteeringType) errors.push("סוג ההתנדבות");
    if (!location.city.trim()) errors.push("עיר");
    if (!date) errors.push("תאריך ההתנדבות");
    if (!time) errors.push("שעת התחלה");
    if (!duration) errors.push("משך ההתנדבות");
    if (!contact.name.trim()) errors.push("שם איש קשר");
    if (!contact.phone.trim()) errors.push("טלפון איש קשר");
    if (!contact.email.trim()) errors.push("מייל איש קשר");
    if (!availableSlots.trim()) errors.push("מספר מקומות פנויים");
    
    return errors;
  };
  
  const handleAddVolunteering = async () => {
    const errors = validateForm();
    
    if (errors.length > 0) {
      Alert.alert('שגיאה', `יש למלא את כל שדות החובה: ${errors.join(', ')}`);
      return;
    }
    
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('לא נמצאה כניסת משתמש');
      return;
    }
    
    // Combine date and time
    const combinedDateTime = new Date(date);
    combinedDateTime.setHours(time.getHours());
    combinedDateTime.setMinutes(time.getMinutes());
    
    const volunteeringData = {
      title,
      shortDescription,
      detailedDescription,
      volunteeringType,
      location,
      date: combinedDateTime.toISOString(),
      duration,
      prerequisites,
      contact,
      additionalInfo,
      availableSlots,
      isAccessible,
      registrationMethod,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    };
    
    try {
      setLoading(true);
      const docRef = doc(db, 'volunteerings', user.uid + '_' + new Date().getTime());
      await setDoc(docRef, volunteeringData);
      Alert.alert('ההתנדבות נוספה בהצלחה');
      navigation.goBack();
    } catch (error) {
      console.error('Error adding volunteering:', error);
      Alert.alert('שגיאה בהוספת התנדבות');
    } finally {
      setLoading(false);
    }
  };
  
  // Format date as string for display
  const formatDate = (date) => {
    if (!date) return 'לא נבחר תאריך';
    return date.toLocaleDateString('he-IL');
  };
  
  // Format time as string for display
  const formatTime = (time) => {
    if (!time) return 'לא נבחרה שעה';
    return time.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  };
  
  // Render required asterisk
  const RequiredAsterisk = () => (
    <Text style={styles.requiredAsterisk}>*</Text>
  );
  
  return (
    <ImageBackground
      source={require('../../assets/all2.png')}
      style={styles.backgroundImage}
    >
      <View style={styles.container}>
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
          הוספת התנדבות
        </Animated.Text>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <KeyboardAvoidingView
          style={styles.formContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : null}
          keyboardVerticalOffset={100}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContainer}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {/* Basic Info */}
            <View style={styles.rtlInputContainer}>
              <TextInput 
                style={styles.input} 
                value={title} 
                onChangeText={setTitle} 
                placeholder="שם ההתנדבות" 
              />
                 <RequiredAsterisk />
            </View>
            
            <View style={styles.rtlInputContainer}>
              <TextInput 
                style={styles.input} 
                value={shortDescription} 
                onChangeText={setShortDescription} 
                placeholder="תיאור קצר"
                 
              />
                 <RequiredAsterisk />
            </View>
            
            <TextInput 
              style={styles.multilineInput} 
              value={detailedDescription} 
              onChangeText={setDetailedDescription} 
              placeholder="תיאור מפורט" 
              multiline 
              numberOfLines={4} 
            />
            
            {/* Volunteering Type Dropdown */}
            <View style={styles.rtlInputContainer}>
              <TouchableOpacity 
                style={styles.dropdownButton} 
                onPress={() => setShowTypeDropdown(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {volunteeringType ? volunteeringType : 'סוג ההתנדבות'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
                
              </TouchableOpacity>
              <RequiredAsterisk />
            </View>
            
            {/* Location Category */}
            <View style={styles.categoryContainer}>
              <View style={styles.rtlCategoryTitleContainer}>
                <Text style={styles.categoryTitle}>מיקום</Text>
              </View>
              <View style={styles.rtlInputContainer}>
                <TextInput 
                  style={styles.categoryInput} 
                  value={location.city} 
                  onChangeText={(text) => setLocation({ ...location, city: text })} 
                  placeholder="עיר" 
                />
                   <RequiredAsterisk />
              </View>

              <TextInput 
              
                style={styles.categoryInput} 
                value={location.address}      
                onChangeText={(text) => setLocation({ ...location, address: text })} 
                placeholder="כתובת מדויקת"           
              />
            </View>
            
            {/* Date Picker */}
            <View style={styles.rtlDateContainer}>
              <Text style={styles.dateLabel}>
              תאריך ההתנדבות:{ "\n\n".repeat(2)} {date ? formatDate(date) : "לא נבחר תאריך"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={styles.dateButton}
              >
                <Text style={styles.dateButtonText}>בחר תאריך</Text>
              </TouchableOpacity>
              <RequiredAsterisk />

            </View>

            {showDatePicker && (
              <DateTimePicker
                value={new Date()}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (event.type === 'set' && selectedDate) {
                    setDate(selectedDate);
                  }
                }}
              />
            )}

            {/* Time Picker */}
            <View style={styles.rtlDateContainer}>
              <Text style={styles.dateLabel}>
                שעת התחלה:{"\n".repeat(2)} {time ? formatTime(time) : "לא נבחרה שעה"}
              </Text>
              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                style={styles.dateButton}
              >
                <Text style={styles.dateButtonText}>בחר שעה</Text>
              </TouchableOpacity>
              <RequiredAsterisk />

            </View>

            {showTimePicker && (
              <DateTimePicker
                value={new Date()}
                mode="time"
                is24Hour={true}
                display="default"
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false);
                  if (event.type === 'set' && selectedTime) {
                    setTime(selectedTime);
                  }
                }}
              />
            )}
            
            {/* Duration Dropdown */}
            <View style={styles.rtlInputContainer}>
              <TouchableOpacity 
                style={styles.dropdownButton} 
                onPress={() => setShowDurationDropdown(true)}
              >
                <Text style={styles.dropdownButtonText}>
                  {duration ? duration : 'משך ההתנדבות'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              <RequiredAsterisk />

            </View>
            
            <TextInput 
              style={styles.prerequisitesInput} 
              value={prerequisites} 
              onChangeText={setPrerequisites} 
              placeholder="דרישות קדם" 
              multiline
              numberOfLines={3}
            />
            
            {/* Contact Category */}
            <View style={styles.categoryContainer}>
              <View style={styles.rtlCategoryTitleContainer}>
                <Text style={styles.categoryTitle}>איש קשר</Text>
              </View>
              <View style={styles.rtlInputContainer}>
                <TextInput 
                  style={styles.categoryInput} 
                  value={contact.name} 
                  onChangeText={(text) => setContact({ ...contact, name: text })} 
                  placeholder="שם" 
                />
                      <RequiredAsterisk />

              </View>
              <View style={styles.rtlInputContainer}>
                <TextInput 
                  style={styles.categoryInput} 
                  value={contact.phone} 
                  onChangeText={(text) => setContact({ ...contact, phone: text })} 
                  placeholder="טלפון" 
                />
                                 <RequiredAsterisk />

              </View>
              <View style={styles.rtlInputContainer}>
                <TextInput 
                  style={styles.categoryInput} 
                  value={contact.email} 
                  onChangeText={(text) => setContact({ ...contact, email: text })} 
                  placeholder="מייל" 
                  editable={false} // המייל מגיע מהמשתמש ולא ניתן לעריכה
                />
                                 <RequiredAsterisk />

              </View>
            </View>
            
            {/* Additional Info */}
            <View style={styles.rtlInputContainer}>
              <TextInput 
                style={styles.input} 
                value={availableSlots} 
                onChangeText={setAvailableSlots} 
                placeholder="מספר מקומות פנויים" 
                keyboardType="numeric" 
              />
                               <RequiredAsterisk />

            </View>
      
            <TextInput 
              style={styles.multilineInput} 
              value={additionalInfo} 
              onChangeText={setAdditionalInfo} 
              placeholder="מידע נוסף" 
              multiline 
              numberOfLines={3} 
            />
              
            <Text style={styles.requiredText}>* שדות חובה</Text>
            
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleAddVolunteering} 
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? 'טוען...' : 'הוסף התנדבות'}</Text>
            </TouchableOpacity>
            
            {/* Add extra space at the bottom for scrolling */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
      
      {/* Volunteering Type Dropdown Modal */}
      <Modal
        transparent={true}
        visible={showTypeDropdown}
        animationType="slide"
        onRequestClose={() => setShowTypeDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>בחר סוג התנדבות</Text>
            {volunteeringTypeOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.modalOption}
                onPress={() => {
                  setVolunteeringType(option);
                  setShowTypeDropdown(false);
                }}
              >
                <Text style={styles.modalOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowTypeDropdown(false)}
            >
              <Text style={styles.modalCloseButtonText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Duration Dropdown Modal */}
      <Modal
        transparent={true}
        visible={showDurationDropdown}
        animationType="slide"
        onRequestClose={() => setShowDurationDropdown(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>בחר משך התנדבות</Text>
            {durationOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.modalOption}
                onPress={() => {
                  setDuration(option);
                  setShowDurationDropdown(false);
                }}
              >
                <Text style={styles.modalOptionText}>{option}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowDurationDropdown(false)}
            >
              <Text style={styles.modalCloseButtonText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    padding: 20,
    marginTop: 50,
    direction: 'rtl',
    paddingBottom: 70,
  },
  formContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 40,
    paddingTop: 20,
    paddingBottom: 20,
    marginTop: 100,
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
  backButton: {
    padding: 10,
    marginBottom: 20,
    zIndex: 2,
  },
  scrollContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    marginVertical: 8,
  },
  rtlInputContainer: {
    flexDirection: 'row', // שונה ל-row רגיל כדי שהכוכבית תהיה מימין
    alignItems: 'center',
    width: '90%',
    marginVertical: 8,
  },
  requiredAsterisk: {
    color: 'red',
    fontSize: 20,
    marginHorizontal: 5,
  },
  input: {
    flex: 1,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    fontSize: 16,
    color: '#34495e',
    textAlign: 'right',
  },
  multilineInput: {
    width: '90%',
    padding: 12,
    marginVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    fontSize: 16,
    color: '#34495e',
    textAlign: 'right',
    minHeight: 100,
    textAlignVertical: 'top',
  },

  prerequisitesInput: {
    width: '90%',
    padding: 12,
    marginVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    fontSize: 16,
    color: '#34495e',
    textAlign: 'right',
    minHeight: 120, // הגדלת גובה השדה של דרישות קדם
    textAlignVertical: 'top',
  },
  categoryContainer: {
    width: '90%',
    backgroundColor: 'rgba(235, 235, 235, 0.7)',
    borderRadius: 12,
    padding: 15,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#d0d0d0',
  },
  categoryTitleContainer: {
    flexDirection: 'row',
    alignItems: 'right',
    marginBottom: 10,
  },
  rtlCategoryTitleContainer: {
    flexDirection: 'row', // שונה ל-row רגיל כדי שהכוכבית תהיה מימין
    alignItems: 'right',
    marginBottom: 10,
    textAlign: 'right',

  },
  categoryTitle: {
    
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'right',
  },
  categoryInput: {
    width: '100%',
    padding: 12,
    marginVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
    fontSize: 16,
    color: '#34495e',
    textAlign: 'right',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    marginVertical: 8,
    paddingHorizontal: 5,
  },
  rtlDateContainer: {
    flexDirection: 'row', // שונה ל-row רגיל כדי שהכוכבית תהיה מימין
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '90%',
    marginVertical: 8,
    paddingHorizontal: 5,
  },
  dateLabel: {
    fontSize: 16,
    color: '#34495e',
    textAlign: 'right',
    flex: 1,
  },
  dateButton: {
    backgroundColor: '#c656ad',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  dateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#c656ad',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 25,
    width: "80%",
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  requiredText: {
    color: 'red',
    textAlign: 'right',
    marginTop: 15,
    width: '90%',
  },
  
  // Dropdown styles
  dropdownButton: {
    flex: 1,
    flexDirection: 'row', // שונה ל-row רגיל
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 8,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#34495e',
    textAlign: 'right',
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
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
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  modalOption: {
    width: '100%',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#333',
  },
  modalCloseButton: {
    marginTop: 20,
    backgroundColor: '#c656ad',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 8,
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AddVolunteering;
