import React, { useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import axios from 'axios';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from '@firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from '@firebase/firestore';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

const AlertNotifications = () => {
  const [lastAlertId, setLastAlertId] = useState(null);
  const [demoMode, setDemoMode] = useState(true);
  const [shouldReceiveAlerts, setShouldReceiveAlerts] = useState(false);
  const [userEmergencyLocations, setUserEmergencyLocations] = useState([]);
  const [currentLocationAlerts, setCurrentLocationAlerts] = useState(true); // הגדרה ברירת מחדל
  const [currentLocation, setCurrentLocation] = useState(null);
  const [userData, setUserData] = useState(null);
  
  const notificationListener = useRef();
  const responseListener = useRef();
  const navigation = useNavigation();
  const auth = getAuth();
  const db = getFirestore();

  // פונקציה לקבלת המיקום הנוכחי
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission to access location was denied');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      };
    } catch (error) {
      console.log('Error getting current location:', error);
      return null;
    }
  };

  // פונקציה להמרת קואורדינטות לשם עיר
  const getCityFromCoordinates = async (latitude, longitude) => {
    try {
      // ניתן להשתמש ב-reverse geocoding API
      // כאן אני משתמש ב-API פשוט, אבל אפשר להשתמש ב-Google Maps API
      const response = await axios.get(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=he`
      );
      
      return response.data.city || response.data.locality || 'מיקום לא ידוע';
    } catch (error) {
      console.log('Error getting city from coordinates:', error);
      return null;
    }
  };

  // בדיקה האם המשתמש זכאי לקבל התראות
  const checkUserEligibility = async () => {
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setShouldReceiveAlerts(false);
        return;
      }

      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserData(userData);
        
        if (userData.isOrganization === true) {
          setShouldReceiveAlerts(false);
        } else {
          setShouldReceiveAlerts(true);
          setUserEmergencyLocations(userData.emergencyLocations || []);
          
          // בדוק אם יש הגדרה לקבלת התראות לפי מיקום נוכחי
          setCurrentLocationAlerts(userData.receiveCurrentLocationAlerts !== false);
        }
      } else {
        setShouldReceiveAlerts(false);
      }
    } catch (error) {
      console.log('Error checking user eligibility:', error);
      setShouldReceiveAlerts(false);
    }
  };

  // עדכון המיקום הנוכחי
  const updateCurrentLocation = async () => {
    if (currentLocationAlerts) {
      const location = await getCurrentLocation();
      setCurrentLocation(location);
    }
  };

  // בדיקת התאמה עם מיקומי החירום המוגדרים
  const checkEmergencyLocationsMatch = (alertData) => {
    if (!userEmergencyLocations.length || !alertData.length) {
      return false;
    }

    const alertCities = alertData.map(city => city.trim().toLowerCase());
    const userCities = userEmergencyLocations.map(loc => loc.name.trim().toLowerCase());

    return alertCities.some(alertCity => 
      userCities.some(userCity => userCity.includes(alertCity) || alertCity.includes(userCity))
    );
  };

  // בדיקת התאמה עם המיקום הנוכחי
  const checkCurrentLocationMatch = async (alertData) => {
    if (!currentLocationAlerts || !currentLocation || !alertData.length) {
      return false;
    }

    try {
      const currentCity = await getCityFromCoordinates(currentLocation.latitude, currentLocation.longitude);
      if (!currentCity) return false;

      const alertCities = alertData.map(city => city.trim().toLowerCase());
      const currentCityLower = currentCity.trim().toLowerCase();

      return alertCities.some(alertCity => 
        currentCityLower.includes(alertCity) || alertCity.includes(currentCityLower)
      );
    } catch (error) {
      console.log('Error checking current location match:', error);
      return false;
    }
  };

  // שליחת התראה
  const sendAlertNotification = async (alert, alertType = 'emergency') => {
    if (!shouldReceiveAlerts) {
      return;
    }

    // בדיקת התאמה עם מיקומים מוגדרים
    const emergencyLocationsMatch = checkEmergencyLocationsMatch(alert.data);
    
    // בדיקת התאמה עם מיקום נוכחי
    const currentLocationMatch = await checkCurrentLocationMatch(alert.data);

    // אם זה לא התראת דמו, בדוק התאמה
    if (alertType !== 'demo' && !emergencyLocationsMatch && !currentLocationMatch) {
      return;
    }

    try {
      let title = alert.title;
      let body = alert.desc;

      // הוסף מידע על סוג ההתראה
      if (alertType === 'demo') {
        title = '🔔 התראת דמו';
        body = `זאת התראת דמו עבור: ${alert.data.join(', ')}`;
      } else {
        // הוסף מידע על למה המשתמש קיבל את ההתראה
        if (emergencyLocationsMatch && currentLocationMatch) {
          body += '\n📍 התראה התקבלה עבור מיקומך הנוכחי ומיקומי החירום שהגדרת';
        } else if (emergencyLocationsMatch) {
          body += '\n🏠 התראה התקבלה עבור מיקומי החירום שהגדרת';
        } else if (currentLocationMatch) {
          body += '\n📍 התראה התקבלה עבור מיקומך הנוכחי';
        }
      }

      const notificationContent = {
        title,
        body,
        data: { alert, alertType },
        priority: 'high',
        vibrate: [0, 250, 250, 250],
        android: {
          channelId: 'alerts',
          priority: 'high',
          vibrate: [0, 250, 250, 250],
          color: alertType === 'demo' ? '#4CAF50' : '#FF0000',
          smallIcon: 'ic_notification',
          largeIcon: 'ic_launcher',
        },
        ios: {
          critical: alertType !== 'demo',
          criticalVolume: alertType !== 'demo' ? 1.0 : 0.5,
        },
      };

      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null,
      });

      console.log(`Alert sent: ${alertType}`, {
        cities: alert.data,
        emergencyLocationsMatch,
        currentLocationMatch
      });

    } catch (error) {
      console.log('Error sending notification:', error);
    }
  };

  // שליחת התראת דמו
  const sendDemoNotification = async () => {
    if (!shouldReceiveAlerts) {
      return;
    }

    // יצירת התראת דמו עם מיקומי החירום של המשתמש
    let demoCities = [];
    
    if (userEmergencyLocations.length > 0) {
      demoCities.push(userEmergencyLocations[0].name);
    }
    
    if (currentLocationAlerts && currentLocation) {
      const currentCity = await getCityFromCoordinates(currentLocation.latitude, currentLocation.longitude);
      if (currentCity && !demoCities.includes(currentCity)) {
        demoCities.push(currentCity);
      }
    }

    if (demoCities.length === 0) {
      demoCities = ['תל אביב']; // ברירת מחדל
    }

    const demoAlert = {
      id: `demo-${Date.now()}`,
      title: 'התראת דמו',
      desc: 'זאת התראת דמו לבדיקת המערכת',
      data: demoCities
    };

    await sendAlertNotification(demoAlert, 'demo');
  };

  // בדיקת התראות חדשות
  const checkForNewAlerts = async () => {
    if (!shouldReceiveAlerts) {
      return;
    }

    try {
      const response = await axios.get('https://www.oref.org.il/WarningMessages/alert/alerts.json');
      const alerts = response.data;

      if (alerts && alerts.length > 0) {
        const latestAlert = alerts[0];

        if (latestAlert.id !== lastAlertId) {
          setLastAlertId(latestAlert.id);
          await sendAlertNotification(latestAlert, 'emergency');
        }
      }
    } catch (error) {
      console.log('Error checking for alerts:', error);
    }
  };

  // הגדרות ראשוניות
  useEffect(() => {
    const setupNotifications = async () => {
      // הגדרת ערוץ אנדרואיד
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('alerts', {
          name: 'Alerts',
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#FF0000',
          sound: 'alert',
          enableVibrate: true,
          enableLights: true,
        });
      }

      // בקשת הרשאות
      await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
        android: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
          allowAnnouncements: true,
        },
      });

      // בדיקת זכאות המשתמש - חכה שזה יסתיים
      await checkUserEligibility();
      
      // עדכון המיקום הנוכחי
      await updateCurrentLocation();

      // הגדרת listeners
      notificationListener.current = Notifications.addNotificationReceivedListener(() => {});
      responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'HomePage',
              params: { openedFromNotification: true }
            }
          ]
        });
      });

      // התחלת בדיקת התראות - רק אחרי שהכל מוכן
      const alertInterval = setInterval(checkForNewAlerts, 30000); // שונה ל-30 שניות

      // עדכון מיקום כל 5 דקות
      const locationInterval = setInterval(updateCurrentLocation, 300000);

      // התראת דמו כל דקה (רק במצב דמו)
      let demoInterval;
      if (demoMode) {
        demoInterval = setInterval(sendDemoNotification, 60000);
      }

      return { alertInterval, locationInterval, demoInterval };
    };

    setupNotifications().then(intervals => {
      // שמירת intervals לניקוי
      return () => {
        if (intervals) {
          clearInterval(intervals.alertInterval);
          clearInterval(intervals.locationInterval);
          if (intervals.demoInterval) {
            clearInterval(intervals.demoInterval);
          }
        }
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      };
    });
  }, []);

  // useEffect לבדיקת שינויים במצב החיבור
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await checkUserEligibility();
        await updateCurrentLocation();
      } else {
        setShouldReceiveAlerts(false);
        setUserData(null);
        setCurrentLocation(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // פונקציות שיכולות להיקרא מבחוץ (אופציונלי)
  const toggleCurrentLocationAlerts = async (enabled) => {
    setCurrentLocationAlerts(enabled);
    
    // עדכון בFirestore
    if (auth.currentUser && userData) {
      try {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          receiveCurrentLocationAlerts: enabled
        });
      } catch (error) {
        console.log('Error updating location alerts preference:', error);
      }
    }
  };

  const testDemoNotification = () => {
    sendDemoNotification();
  };

  return null;
};

export default AlertNotifications;