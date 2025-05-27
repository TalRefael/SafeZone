import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  View,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import * as SMS from 'expo-sms';

/**
 * כפתור "אני בטוח" - שולח הודעה לאנשי הקשר לחירום באמצעות expo-sms
 * @param {object} customNavigation - אובייקט navigation מותאם אישית (אופציונלי)
 */
const DirectSafeButton = ({ customNavigation }) => {
  const [sending, setSending] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const defaultNavigation = useNavigation();
  const route = useRoute();
  const navigation = customNavigation || defaultNavigation;

  // בדיקה אם נכנסנו דרך ההתראה
  useFocusEffect(
    React.useCallback(() => {
      const openedFromNotification = route.params?.openedFromNotification;
      
      if (openedFromNotification) {
        setIsVisible(true);
        // מנקה את הפרמטר אחרי השימוש בו
        navigation.setParams({ openedFromNotification: undefined });
        
        // מפעיל טיימר חדש
        const timer = setTimeout(() => {
          console.log('Timer finished - hiding button');
          setIsVisible(false);
        }, 20000);

        // מנקה את הטיימר כשהקומפוננטה מתפרקת או כשהדף מאבד פוקוס
        return () => {
          console.log('Cleaning up timer');
          clearTimeout(timer);
        };
      }
    }, [route.params])
  );

  // טיימר נפרד לבדיקת הזמן
  useEffect(() => {
    let timer;
    if (isVisible) {
      console.log('Starting visibility timer');
      timer = setTimeout(() => {
        console.log('Visibility timer finished');
        setIsVisible(false);
      }, 20000);
    }
    return () => {
      if (timer) {
        console.log('Cleaning up visibility timer');
        clearTimeout(timer);
      }
    };
  }, [isVisible]);

  // בדיקת פרמטרים בכל פעם שהדף מקבל פוקוס
  useEffect(() => {
    console.log('Component mounted/updated, route params:', route.params);
  }, [route.params]);

  /**
   * מקבל את פרטי המשתמש ואנשי הקשר לחירום מה-Firestore
   * @returns {Promise<object>} נתוני המשתמש ואנשי הקשר לחירום
   */
  const getUserAndContacts = async () => {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('משתמש לא מחובר');
    }

    const db = getFirestore();
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

    if (!userDoc.exists()) {
      throw new Error('מידע המשתמש לא נמצא');
    }

    const userData = userDoc.data();
    const emergencyContacts = userData.emergencyContacts || [];

    if (emergencyContacts.length === 0) {
      throw new Error('NO_CONTACTS');
    }

    return {
      userData,
      emergencyContacts
    };
  };

  /**
   * מכין את מספרי הטלפון של אנשי הקשר בפורמט הנכון
   * @param {Array} contacts - רשימת אנשי הקשר
   * @returns {Array} מספרי טלפון מעובדים
   */
  const formatPhoneNumbers = (contacts) => {
    return contacts.map(contact => {
      let number = contact.phoneNumber.replace(/\D/g, '');
      // מסיר את הספרה 0 בתחילת המספר אם קיימת
      if (number.startsWith('0')) number = number.substring(1);
      // מוסיף קידומת ישראל אם אין קידומת בינלאומית
      return number.startsWith('+') ? number : `+972${number}`;
    });
  };

  /**
   * שולח הודעת SMS באמצעות expo-sms
   * @param {Array} phoneNumbers - מספרי הטלפון המעובדים
   * @param {string} message - תוכן ההודעה
   */
  const sendSmsUsingExpo = async (phoneNumbers, message) => {
    try {
      // בדיקה אם שליחת SMS זמינה במכשיר
      const isAvailable = await SMS.isAvailableAsync();
      
      if (!isAvailable) {
        throw new Error('שליחת SMS אינה זמינה במכשיר זה');
      }
      
      console.log(`שולח SMS ל-${phoneNumbers.length} אנשי קשר:`, phoneNumbers);
      
      // שליחת ההודעה באמצעות expo-sms API
      const { result } = await SMS.sendSMSAsync(
        phoneNumbers,
        message
      );
      
      console.log('תוצאת שליחת ה-SMS:', result);
      
      // טיפול בתוצאות השליחה
      if (result === 'sent') {
        Alert.alert('הצלחה', 'ההודעה נשלחה בהצלחה לאנשי הקשר לחירום');
      } else if (result === 'cancelled') {
        console.log('המשתמש ביטל את שליחת ההודעה');
      } else {
        console.log('תוצאה לא ידועה:', result);
      }
      
      return result;
    } catch (error) {
      console.error('שגיאה בשליחת SMS באמצעות expo-sms:', error);
      throw error;
    }
  };

  /**
   * שולח את הודעת "אני בטוח" לאנשי הקשר לחירום
   */
  const sendSafeMessage = async () => {
    try {
      console.log('התחלת תהליך שליחת הודעת אני בטוח');
      setSending(true);
      
      // קבלת נתוני המשתמש ואנשי הקשר
      const { userData, emergencyContacts } = await getUserAndContacts();

      // יצירת הודעה
      const userName = userData.firstName || 'משתמש';
      const messageText = `הודעה מ${userName}: אני נמצא במקום בטוח, הכל בסדר!`;

      // עיבוד מספרי טלפון
      const phoneNumbers = formatPhoneNumbers(emergencyContacts);
      
      console.log(`מספר אנשי קשר לשליחה: ${phoneNumbers.length}`);
      
      // שליחת ההודעה באמצעות expo-sms
      await sendSmsUsingExpo(phoneNumbers, messageText);

    } catch (error) {
      console.error('שגיאה בשליחת הודעת אני בטוח:', error);
      
      // טיפול מיוחד אם אין אנשי קשר
      if (error.message === 'NO_CONTACTS') {
        Alert.alert(
          'אין אנשי קשר', 
          'לא הוגדרו אנשי קשר לחירום. האם ברצונך להגדיר אנשי קשר עכשיו?',
          [
            {
              text: 'כן',
              onPress: () => navigation.navigate('EmergencyContactsScreen')
            },
            {
              text: 'לא',
              style: 'cancel'
            }
          ]
        );
      } else if (error.message === 'שליחת SMS אינה זמינה במכשיר זה') {
        Alert.alert(
          'שגיאה',
          'שליחת SMS אינה זמינה במכשיר זה. נסה דרך אחרת ליצירת קשר.'
        );
      } else {
        Alert.alert('שגיאה', error.message || 'לא ניתן לשלוח את ההודעה.');
      }
    } finally {
      setSending(false);
    }
  };

  /**
   * מציג חלון אישור לפני שליחת ההודעה
   */
  const confirmAndSend = () => {
    Alert.alert(
      'שליחת הודעת "אני בטוח"',
      'האם לשלוח הודעת "אני בטוח, הכל בסדר" לכל אנשי הקשר לחירום?',
      [
        { text: 'ביטול', style: 'cancel' },
        { text: 'שלח', onPress: sendSafeMessage }
      ]
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeAreaContainer}>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.safeButton}
          onPress={confirmAndSend}
          disabled={sending}
          accessibilityLabel="כפתור אני בטוח"
          accessibilityHint="לחץ כדי לשלוח הודעה שאתה במקום בטוח לאנשי הקשר לחירום"
        >
          {sending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="shield-checkmark" size={24} color="#fff" />
              <Text style={styles.safeButtonText}>אני בטוח</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    position: 'absolute',
    width: '100%',
    bottom: 20,
    zIndex: 1000,
  },
  buttonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeButton: {
    backgroundColor: '#2ecc71',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 30,
    elevation: 8, // הגדלת elevation ב-Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    margin: 10,
    minWidth: 200,
    minHeight: 60,
  },
  safeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 20,
    marginLeft: 8,
    textAlign: 'center',
  }
});

export default DirectSafeButton;
