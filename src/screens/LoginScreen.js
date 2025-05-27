import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ImageBackground,
  Image,
  Alert,
  Switch,
} from 'react-native';
import { signInWithEmailAndPassword } from '@firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';

const LoginScreen = ({ auth, navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // הוספת שדה שם משתמש
  const [isChildLogin, setIsChildLogin] = useState(false); // מצב להחלפה בין התחברות רגילה לפרופיל ילד
  const [isLoading, setIsLoading] = useState(false);
  const imageAnimation = useRef(new Animated.Value(0)).current;
  const logoContainerAnimation = useRef(new Animated.Value(-100)).current;
  const inputContainerAnimation = useRef(new Animated.Value(100)).current;
  const buttonAnimation = useRef(new Animated.Value(1)).current;
  
  const logoScale = useRef(new Animated.Value(1)).current;
  const logoAnimationRef = useRef(null);

  // מנטרלים את התצוגה של שגיאות ב-Firebase
  useEffect(() => {
    // מנטרל את הלוגים של שגיאות Firebase בקונסול
    const originalConsoleError = console.error;
    console.error = (...args) => {
      // בודק אם השגיאה היא מהתחברות ב-Firebase
      if (args[0] && typeof args[0] === 'string' && args[0].includes('Firebase')) {
        // מתעלם משגיאות התחברות של Firebase
        return;
      }
      originalConsoleError(...args);
    };

    return () => {
      // מחזיר את הפונקציה המקורית כשהקומפוננטה מתפרקת
      console.error = originalConsoleError;
    };
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonAnimation, {
          toValue: 0.8,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(buttonAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(imageAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(imageAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.parallel([
      Animated.timing(logoContainerAnimation, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(inputContainerAnimation, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [imageAnimation]);

  const opacity = imageAnimation.interpolate({
    inputRange: [0.01, 1],
    outputRange: [0.5, 1],
  });

  const stopLogoAnimation = () => {
    if (logoAnimationRef.current) {
      logoAnimationRef.current.stop();
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    setIsLoading(false);
  };

  const startLogoAnimation = () => {
    setIsLoading(true);
    logoAnimationRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 3,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ])
    );
    
    logoAnimationRef.current.start();
  };

  // מפה שממירה קודי שגיאה של Firebase להודעות ידידותיות
  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'כתובת המייל אינה תקינה';
      case 'auth/user-disabled':
        return 'חשבון זה הושבת';
      case 'auth/user-not-found':
        return 'משתמש זה אינו קיים';
      case 'auth/wrong-password':
        return 'סיסמה שגויה';
      case 'auth/invalid-credential':
        return 'פרטי ההתחברות שגויים';
      case 'auth/too-many-requests':
        return 'יותר מדי ניסיונות התחברות, נסה שוב מאוחר יותר';
      default:
        return 'שגיאה בהתחברות, אנא נסה שוב';
    }
  };

  // התחברות עם פרופיל ילד
  const handleChildSignIn = async () => {
    if (!username || !password) {
      Alert.alert('שגיאה', 'נא למלא שם משתמש וסיסמה');
      stopLogoAnimation();
      return;
    }
  
    try {
      const db = getFirestore();
      
      // הדפסת ערכים לדיבוג
      console.log("מנסה להתחבר עם:", { username, password });
      
      // חיפוש פרופיל ילד עם שם המשתמש והסיסמה שהוזנו
      const childProfilesRef = collection(db, 'childProfiles');
      
      // בדיקה שהקולקציה קיימת וניתן לגשת אליה
      const testSnapshot = await getDocs(collection(db, 'childProfiles'));
      console.log("מספר המסמכים בקולקציה:", testSnapshot.size);
      
      // שינוי - קודם חפש רק לפי שם משתמש כדי לבדוק אם הוא בכלל קיים
      const usernameQuery = query(
        childProfilesRef, 
        where('username', '==', username)
      );
      
      const usernameSnapshot = await getDocs(usernameQuery);
      
      if (usernameSnapshot.empty) {
        console.log("שם המשתמש לא נמצא");
        Alert.alert('שגיאה', 'שם משתמש לא קיים');
        stopLogoAnimation();
        return;
      }
      
      // אם מצאנו את שם המשתמש, בדוק את הסיסמה
      let foundMatch = false;
      usernameSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("נמצא משתמש:", data.username, "סיסמה במסד:", data.password);
        
        if (data.password === password) {
          foundMatch = true;
          // מצאנו התאמה - מעבירים את פרטי הילד למסך הבא
          const childProfile = {
            id: doc.id,
            ...data
          };
          
          navigation.navigate('HomePage_kids', { childData: childProfile });
        }
      });
      
      if (!foundMatch) {
        console.log("הסיסמה לא תואמת");
        Alert.alert('שגיאה', 'סיסמה לא נכונה');
        stopLogoAnimation();
        return;
      }
      
    } catch (error) {
      stopLogoAnimation();
      console.error("שגיאה מפורטת:", error);
      Alert.alert('שגיאה בהתחברות', 'אירעה שגיאה בניסיון ההתחברות, אנא נסה שוב');
      
      if (__DEV__) {
        console.log('Child login error (development only):', error);
      }
    }
  };

  // התחברות עם חשבון רגיל (הורה)
  const handleParentSignIn = async () => {
    if (!email || !password) {
      Alert.alert('שגיאה', 'תמלא בבקשה מייל וסיסמה!');
      stopLogoAnimation();
      return;
    }

    try {
      // מנסים להתחבר עם ה-Firebase auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log('User signed in successfully!');

      const db = getFirestore();
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        if (userData.isOrganization === true) {
          navigation.navigate('HomePage_organ');
        } else {
          navigation.navigate('HomePage');
        }
      } else {
        console.log('No user data found');
        Alert.alert('שגיאה', 'לא נמצאו נתוני משתמש');
        stopLogoAnimation();
      }
    } catch (error) {
      // מטפלים בשגיאה באופן מותאם אישית
      stopLogoAnimation();
      
      // משתמשים במפה להמרת קוד השגיאה להודעה מותאמת
      const errorMessage = getErrorMessage(error.code);
      
      // מציגים את הודעת השגיאה באמצעות Alert במקום להסתמך על הודעות של Firebase
      Alert.alert('שגיאה בהתחברות', errorMessage);
      
      // כאן כדאי לרשום לקונסול רק בזמן פיתוח
      if (__DEV__) {
        console.log('Login error (development only):', error.code, error.message);
      }
    }
  };

  const handleSignIn = async () => {
    if (isChildLogin) {
      await handleChildSignIn();
    } else {
      await handleParentSignIn();
    }
  };

  const handleArrowPress = () => {
    if (!isLoading) {
      startLogoAnimation();
      handleSignIn();
    }
  };

  // מעבר בין התחברות הורה לילד
  const toggleLoginMode = () => {
    setIsChildLogin(!isChildLogin);
    // איפוס שדות הקלט בעת החלפת מצב
    setEmail('');
    setPassword('');
    setUsername('');
  };

  return (
    <ImageBackground
      source={require('../../assets/start.png')}
      style={styles.backgroundImage}
    >
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.logoContainer,
            { transform: [{ translateY: logoContainerAnimation }] },
          ]}
        >
          <ImageBackground
            source={require('../../assets/תמונה-7.png')}
            style={styles.logoBackground}
          >
            <Animated.Image
              source={require('../../assets/magen_gold.png')}
              style={[
                styles.logoInContainer,
                { opacity, transform: [{ scale: logoScale }] },
              ]}
            />
          </ImageBackground>
        </Animated.View>

        <Animated.View
          style={[
            styles.inputContainer,
            { transform: [{ translateY: inputContainerAnimation }] },
          ]}
        >
          {/* מתג החלפה בין מצבי התחברות */}
          <View style={styles.switchContainer}>
            <Text style={[styles.switchLabel, !isChildLogin ? styles.activeText : {}]}>מבוגר</Text>
            <Switch
              value={isChildLogin}
              onValueChange={toggleLoginMode}
              trackColor={{ false: '#81b0ff', true: '#2c6975' }}
              thumbColor={isChildLogin ? '#f5dd4b' : '#f4f3f4'}
            />
            <Text style={[styles.switchLabel, isChildLogin ? styles.activeText : {}]}>ילד</Text>
          </View>

          {isChildLogin ? (
            // שדות הזנה עבור כניסת ילד
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="שם משתמש"
              autoCapitalize="none"
              placeholderTextColor="#7f8c8d"
            />
          ) : (
            // שדות הזנה עבור כניסת הורה
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="אימייל"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#7f8c8d"
            />
          )}

          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="סיסמה"
            secureTextEntry
            placeholderTextColor="#7f8c8d"
          />

          <TouchableOpacity onPress={handleArrowPress} disabled={isLoading}>
            <Animated.View
              style={[
                styles.button,
                { opacity: buttonAnimation },
              ]}
            >
              <View style={styles.arrowContainer}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </View>
            </Animated.View>
          </TouchableOpacity>

          {!isChildLogin && (
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.forgotPassword}>שכחת סיסמה?</Text>
            </TouchableOpacity>
          )}

          {!isChildLogin && (
            <View style={styles.footer}>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.toggleText}>עדיין אין לך חשבון? הירשם כאן</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
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
  logoContainer: {
    width: 190,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
    marginBottom: 40,
    marginTop: -50,
  },
  logoBackground: {
    width: 190,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
  },
  logoInContainer: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
    backgroundColor: 'transparent',
    marginTop: -20,
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 40,
    paddingVertical: 40,
    marginTop: 20,
  },
  input: {
    width: '80%',
    textAlign: 'right',
    padding: 10,
    marginVertical: 10,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderColor: '#bdc3c7',
    fontSize: 16,
    color: '#34495e',
  },
  button: {
    flexDirection: 'row',
    width: 60,
    height: 60,
    paddingHorizontal: 20,
    backgroundColor: '#2c6975',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 3, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
    marginTop: 20,
    marginRight: 250,
  },
  forgotPassword: {
    color: '#12405a',
    textAlign: 'center',
    fontSize: 14,
    marginTop: 30,
  },
  footer: {
    marginTop: 10,
    alignItems: 'center',
  },
  toggleText: {
    color: '#12405a',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
  },
  // סגנונות חדשים למתג החלפה
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  switchLabel: {
    marginHorizontal: 10,
    fontSize: 16,
    color: '#7f8c8d',
  },
  activeText: {
    color: '#2c6975',
    fontWeight: 'bold',
  },
});

export default LoginScreen;
