import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as Contacts from 'expo-contacts';
import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView, Platform } from 'react-native';


const { width, height } = Dimensions.get('window');

const EmergencyContactsScreen = ({ navigation }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newContact, setNewContact] = useState({ name: '', phoneNumber: '' });
  const [searchText, setSearchText] = useState('');
  const [filteredContacts, setFilteredContacts] = useState([]);

  // אנימציות
  const translateY = useRef(new Animated.Value(-800)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const listItemAnimations = useRef([]).current;

  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    loadEmergencyContacts();
    
    // הפעלת אנימציות
    Animated.timing(translateY, {
      toValue: -690,
      duration: 1000,
      useNativeDriver: true,
    }).start();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

    
  // החל פילטרים בכל שינוי של חיפוש טקסט
  useEffect(() => {
    applyFilters();
  }, [contacts, searchText]);

  // עדכון אנימציות פריטי הרשימה
  useEffect(() => {
    if (filteredContacts.length > 0) {
      // איפוס מערך האנימציות אם גודל הרשימה השתנה
      if (listItemAnimations.length !== filteredContacts.length) {
        listItemAnimations.length = 0;
        filteredContacts.forEach(() => {
          listItemAnimations.push(new Animated.Value(0));
        });
      }
      
      // הפעלת אנימציה עבור כל פריט ברשימה עם עיכוב מדורג
      const animations = listItemAnimations.map((anim, index) => {
        return Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          delay: index * 100,
          useNativeDriver: true,
        });
      });
      
      Animated.stagger(100, animations).start();
    }
  }, [filteredContacts]);

  const loadEmergencyContacts = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setContacts(userData.emergencyContacts || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading emergency contacts:', error);
      setLoading(false);
      Alert.alert('שגיאה', 'לא ניתן לטעון את אנשי הקשר לחירום');
    }
  };

  const saveEmergencyContacts = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) return;

      await updateDoc(doc(db, 'users', userId), {
        emergencyContacts: contacts
      });

      setLoading(false);
      Alert.alert('נשמר בהצלחה', 'אנשי הקשר לחירום נשמרו בהצלחה');
    } catch (error) {
      console.error('Error saving emergency contacts:', error);
      setLoading(false);
      Alert.alert('שגיאה', 'לא ניתן לשמור את אנשי הקשר לחירום');
    }
  };

  const addContact = () => {
    // וידוא שהשדות לא ריקים
    if (!newContact.name.trim() || !newContact.phoneNumber.trim()) {
      Alert.alert('שגיאה', 'נא למלא את כל השדות');
      return;
    }

    // וידוא פורמט מספר טלפון
    const phoneRegex = /^[0-9]{10,13}$/;
    if (!phoneRegex.test(newContact.phoneNumber.replace(/[- ]/g, ''))) {
      Alert.alert('שגיאה', 'מספר טלפון לא תקין');
      return;
    }

    // הוספת איש קשר חדש
    setContacts([...contacts, { ...newContact }]);
    setNewContact({ name: '', phoneNumber: '' });
    setAddModalVisible(false);
  };

  const removeContact = (index) => {
    Alert.alert(
      'מחיקת איש קשר',
      'האם אתה בטוח שברצונך למחוק איש קשר זה?',
      [
        {
          text: 'ביטול',
          style: 'cancel',
        },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: () => {
            const updatedContacts = [...contacts];
            updatedContacts.splice(index, 1);
            setContacts(updatedContacts);
          },
        },
      ],
      { cancelable: true }
    );
  };

  const importFromContacts = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('הרשאה נדרשת', 'נדרשת הרשאה לגישה לאנשי הקשר');
        return;
      }

      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers]
      });

      if (data.length > 0) {
        navigation.navigate('ContactsPickerScreen', {
          contacts: data,
          onContactsSelected: (selectedContacts) => {
            const formattedContacts = selectedContacts.map(contact => ({
              name: contact.name,
              phoneNumber: contact.phoneNumber
            }));
            setContacts([...contacts, ...formattedContacts]);
          }
        });
      } else {
        Alert.alert('אין אנשי קשר', 'לא נמצאו אנשי קשר במכשיר');
      }
    } catch (error) {
      console.error('Error accessing contacts:', error);
      Alert.alert('שגיאה', 'לא ניתן לגשת לאנשי הקשר');
    }
  };

  // החלת הפילטרים על רשימת אנשי הקשר
  const applyFilters = () => {
    // אם אין אנשי קשר, אין מה לפלטר
    if (!contacts.length) {
      setFilteredContacts([]);
      return;
    }
    
    let result = [...contacts];
    
    // פילטור לפי טקסט חיפוש
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(contact => 
        (contact.name && contact.name.toLowerCase().includes(searchLower)) ||
        (contact.phoneNumber && contact.phoneNumber.includes(searchLower))
      );
    }
    
    setFilteredContacts(result);
  };

  // רינדור פריט איש קשר ברשימה
  const renderContactItem = ({ item, index }) => {
    // הגדרת אנימציה לפריט הנוכחי
    const itemAnimation = listItemAnimations[index] || new Animated.Value(1);
    
    return (
      <Animated.View
        style={{
          opacity: itemAnimation,
          transform: [
            { translateY: itemAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }
          ]
        }}
      >
        <View style={styles.childCard}>
          <LinearGradient
            colors={['rgba(44, 105, 117, 0.05)', 'rgba(79, 157, 166, 0.1)', 'rgba(44, 105, 117, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          />
          <View style={styles.childInfo}>
            <View style={styles.childMainInfo}>
              <View style={styles.childTextInfo}>
                <Text style={styles.childName}>{item.name}</Text>
                <Text style={styles.childUsername}>{item.phoneNumber}</Text>
              </View>
              <View style={styles.contactIcon}>
                <Ionicons name="call" size={24} color="#2c6975" />
              </View>
            </View>
            
            {/* כפתורי עריכה ומחיקה */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]} 
                onPress={() => removeContact(index)}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>מחיקה</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  // רינדור מספר אנשי הקשר שנמצאו
  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.resultCount}>
        נמצאו {filteredContacts.length} אנשי קשר לחירום
      </Text>
    </View>
  );

  return (

      <View style={styles.container}>
        {/* חצי עיגול עם גרדיאנט */}
        <Animated.View
          style={[
            styles.halfCircle,
            {
              transform: [{ translateY }],
            },
          ]}
        >
         <LinearGradient
          colors={['#ffffff', '#588192', '#d5dbcb']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
        </Animated.View>
        
        {/* כותרת */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>אנשי קשר לחירום</Text>
          
          {/* כפתור הוספה */}
          <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addButton}>
            <Ionicons name="add-circle" size={32} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* תיבת חיפוש */}
        <Animated.View 
          style={[styles.searchContainer, { opacity: fadeAnim }]}
        >
          <TextInput
            style={styles.searchInput}
            placeholder="חיפוש אנשי קשר..."
            value={searchText}
            onChangeText={setSearchText}
            placeholderTextColor="#7f8c8d"
          />
          <Ionicons name="search" size={24} color="#2c6975" />
        </Animated.View>
        
        {/* תיאור המסך */}
        <Animated.View style={[styles.descriptionContainer, { opacity: fadeAnim }]}>
          <Text style={styles.description}>
            הגדר אנשי קשר שיקבלו הודעה אוטומטית בעת שליחת התראת "אני בטוח"
          </Text>
        </Animated.View>
        
        {/* רשימת אנשי הקשר המסוננת */}
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {loading ? (
            <ActivityIndicator size="large" color="#2c6975" style={styles.loader} />
          ) : (
            <FlatList
              data={filteredContacts}
              renderItem={renderContactItem}
              keyExtractor={(_, index) => index.toString()}
              contentContainerStyle={styles.list}
              ListHeaderComponent={renderHeader}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyTitle}>לא נמצאו אנשי קשר</Text>
                  <Text style={styles.emptyText}>לחץ על כפתור ה+ כדי להוסיף איש קשר חדש</Text>
                </View>
              }
            />
          )}
        </Animated.View>
        
        {/* כפתור שמירה תחתון */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveEmergencyContacts}
          disabled={loading}
        >
          <LinearGradient
            colors={['#2c6975', '#4f9da6', '#2c6975']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.saveButtonText}>שמור אנשי קשר</Text>
                <Ionicons name="save" size={24} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        
        {/* מודאל הוספת איש קשר */}
<Modal
  visible={addModalVisible}
  transparent={true}
  animationType="slide"
  onRequestClose={() => setAddModalVisible(false)}
>
  <KeyboardAvoidingView 
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    style={styles.modalContainer}
  >
    <View style={styles.modalContent}>
      <LinearGradient
        colors={['rgba(44, 105, 117, 0.1)', 'rgba(79, 157, 166, 0.05)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.modalGradient}
      />
      <Text style={styles.modalTitle}>הוספת איש קשר לחירום</Text>
      
      <ScrollView style={styles.formContainer}>
        {/* שם מלא */}
        <Text style={styles.inputLabel}>שם מלא</Text>
        <TextInput
          style={styles.input}
          placeholder="הכנס שם מלא"
          value={newContact.name}
          onChangeText={(text) => setNewContact(prev => ({ ...prev, name: text }))}
          textAlign="right"
        />
        
        {/* מספר טלפון */}
        <Text style={styles.inputLabel}>מספר טלפון</Text>
        <TextInput
          style={styles.input}
          placeholder="הכנס מספר טלפון"
          value={newContact.phoneNumber}
          onChangeText={(text) => setNewContact(prev => ({ ...prev, phoneNumber: text }))}
          keyboardType="phone-pad"
          textAlign="right"
        />
        
        {/* כפתור ייבוא מאנשי קשר */}
        <TouchableOpacity 
          style={styles.importButton} 
          onPress={() => {
            setAddModalVisible(false);
            importFromContacts();
          }}
        >
          <Text style={styles.importButtonText}>ייבא מאנשי הקשר במכשיר</Text>
          <Ionicons name="people-outline" size={20} color="#2c6975" />
        </TouchableOpacity>
      </ScrollView>
      
      {/* כפתורי הפעולה */}
      <View style={styles.modalActions}>
        <TouchableOpacity 
          style={[styles.modalButton, styles.cancelButton]} 
          onPress={() => {
            setNewContact({
              name: '',
              phoneNumber: '',
            });
            setAddModalVisible(false);
          }}
        >
          <Text style={styles.cancelButtonText}>ביטול</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.modalButton} 
          onPress={addContact}
        >
          <Text style={styles.modalButtonText}>הוסף איש קשר</Text>
        </TouchableOpacity>
      </View>
    </View>
  </KeyboardAvoidingView>
</Modal>
      </View>
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
    padding: 16,
  },
  // חצי עיגול בהשראת מסך פרופילי הילדים
  halfCircle: {
    position: 'absolute',
    top: 0,
    left: width / 2 - 500,
    width: 1000,
    height: 1000,
    borderRadius: 400,
    overflow: 'hidden',
    zIndex: -1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 20,
    position: 'relative',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  backButton: {
    position: 'absolute',
    left: 0,
  },
  addButton: {
    position: 'absolute',
    right: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    alignItems: 'center',
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
  descriptionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#2c6975',
    textAlign: 'center',
    fontWeight: '500',
  },
  list: {
    paddingBottom: 80,
  },
  listHeader: {
    padding: 10,
    backgroundColor: 'rgba(44, 105, 117, 0.1)',
    borderRadius: 10,
    marginVertical: 10,
  },
  resultCount: {
    color: '#2c6975',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  childCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  childInfo: {
    flex: 1,
  },
  childMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  contactIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(44, 105, 117, 0.1)',
    marginLeft: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childTextInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  childName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c6975',
    marginBottom: 5,
    textAlign: 'right',
  },
  childUsername: {
    fontSize: 14,
    color: '#34495e',
    textAlign: 'right',
    marginBottom: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 5,
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  emptyList: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c6975',
    marginBottom: 10,
  },
  emptyText: {
    color: '#2c6975',
    fontSize: 16,
    textAlign: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
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
    position: 'relative',
    overflow: 'hidden',
  },
  modalGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c6975',
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
    marginTop: 15,
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 10,
    paddingHorizontal: 15,
    textAlign: 'right',
    backgroundColor: '#f9f9f9',
  },
  importButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(44, 105, 117, 0.1)',
    borderRadius: 10,
    padding: 12,
    marginTop: 15,
  },
  importButtonText: {
    color: '#2c6975',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  modalActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#2c6975',
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2c6975',
  },
  cancelButtonText: {
    color: '#2c6975',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default EmergencyContactsScreen;
