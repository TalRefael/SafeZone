import React, { useEffect, useState, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import axios from 'axios';
import { Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getAuth } from '@firebase/auth';
import { getFirestore, doc, getDoc } from '@firebase/firestore';

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
  const notificationListener = useRef();
  const responseListener = useRef();
  const navigation = useNavigation();
  const auth = getAuth();
  const db = getFirestore();
  const [userEmergencyLocations, setUserEmergencyLocations] = useState([]);

  // בדיקה האם המשתמש זכאי לקבל התראות
  const checkUserEligibility = async () => {
    try {
      const currentUser = auth.currentUser;
      
      // אם אין משתמש מחובר - לא לקבל התראות
      if (!currentUser) {
        setShouldReceiveAlerts(false);
        return;
      }

      // קבלת נתוני המשתמש מ-Firestore
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // אם המשתמש הוא ארגון - לא לקבל התראות
        if (userData.isOrganization === true) {
          setShouldReceiveAlerts(false);
        } else {
          // משתמש רגיל - לקבל התראות
          setShouldReceiveAlerts(true);
          setUserEmergencyLocations(userData.emergencyLocations || []);
        }
      } else {
        // אם אין נתונים - לא לקבל התראות
        setShouldReceiveAlerts(false);
      }
    } catch (error) {
      console.log('Error checking user eligibility:', error);
      setShouldReceiveAlerts(false);
    }
  };

  const checkLocationMatch = (alertData) => {
    if (!userEmergencyLocations.length || !alertData.length) {
      return false;
    }

    const alertCities = alertData.map(city => city.trim().toLowerCase());
    const userCities = userEmergencyLocations.map(loc => loc.name.trim().toLowerCase());

    return alertCities.some(alertCity => 
      userCities.some(userCity => userCity.includes(alertCity) || alertCity.includes(userCity))
    );
  };

  const sendAlertNotification = async (alert) => {
    // בדיקה אם המשתמש זכאי לקבל התראות
    if (!shouldReceiveAlerts) {
      return;
    }

    if (!checkLocationMatch(alert.data)) {
      return;
    }

    try {
      const notificationContent = {
        title: alert.title,
        body: alert.desc,
        data: { alert },
        priority: 'high',
        vibrate: [0, 250, 250, 250],
        android: {
          channelId: 'alerts',
          priority: 'high',
          vibrate: [0, 250, 250, 250],
          color: '#FF0000',
          smallIcon: 'ic_notification',
          largeIcon: 'ic_launcher',
        },
        ios: {
          critical: true,
          criticalVolume: 1.0,
        },
      };

      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null,
      });
    } catch (error) {
      // שגיאה בשקט - אופציונלי: אפשר להוסיף טיפול שגיאה גלובלי
    }
  };

  const sendDemoNotification = async () => {
    // בדיקה אם המשתמש זכאי לקבל התראות
    if (!shouldReceiveAlerts) {
      return;
    }

    if (!userEmergencyLocations.length) {
      return;
    }

    const demoAlert = {
      id: `demo-${Date.now()}`,
      title: 'התראת דמו',
      desc: 'זוהי התראת דמו לבדיקת המערכת',
      data: [userEmergencyLocations[0].name]
    };
    await sendAlertNotification(demoAlert);
  };

  const checkForNewAlerts = async () => {
    // בדיקה אם המשתמש זכאי לקבל התראות
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
          await sendAlertNotification(latestAlert);
        }
      }
    } catch (error) {
      // שגיאה בשקט
    }
  };

  useEffect(() => {
    const setupAndroidChannel = async () => {
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
    };

    const requestPermissions = async () => {
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
    };

    setupAndroidChannel();
    requestPermissions();

    // בדיקת זכאות המשתמש לקבלת התראות
    checkUserEligibility();

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

    const alertInterval = setInterval(checkForNewAlerts, 5000);
    let demoInterval;
    if (demoMode) {
      demoInterval = setInterval(sendDemoNotification, 60000);
    }

    return () => {
      clearInterval(alertInterval);
      if (demoInterval) {
        clearInterval(demoInterval);
      }
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [shouldReceiveAlerts]);

  // useEffect נוסף לבדיקת שינויים במצב החיבור
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // משתמש התחבר - בדוק את הזכאות שלו
        checkUserEligibility();
      } else {
        // משתמש התנתק - אל תקבל התראות
        setShouldReceiveAlerts(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return null;
};

export default AlertNotifications;