import React, { useRef, useState, useEffect } from 'react';
import { BlurView } from '@react-native-community/blur'; // ייבוא של ספריית טשטוש
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ImageBackground,
  Image,
  Switch,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { createUserWithEmailAndPassword } from '@firebase/auth';
import { setDoc, doc } from '@firebase/firestore';

const SignUpScreen = ({ auth, db, navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState(''); // הוספת שם משתמש
  const [id, setId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [isOrganization, setIsOrganization] = useState(false);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationPurpose, setOrganizationPurpose] = useState('');
  const [gender, setGender] = useState(''); // מצב למגדר
  const [isModalVisible, setIsModalVisible] = useState(false); // מצב לשליטת התצוגה של המודל

  const logoAnimation = useRef(new Animated.Value(0)).current;
  const logoContainerAnimation = useRef(new Animated.Value(-100)).current;
  const inputContainerAnimation = useRef(new Animated.Value(100)).current;
  
  const footerAnimation = useRef(new Animated.Value(100)).current;
  const toggleTextAnimation = useRef(new Animated.Value(100)).current;
  const formContainerAnimation = useRef(new Animated.Value(100)).current;

  // אפקט ברק ללוגו
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
      Animated.timing(inputContainerAnimation, {
        toValue: 0,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(footerAnimation, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(toggleTextAnimation, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(formContainerAnimation, {
        toValue: 0,
        duration: 1400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [logoAnimation]);

  const opacity = logoAnimation.interpolate({
    inputRange: [0.01, 1],
    outputRange: [0.5, 1], // הבהוב קל
  });

  const validateFirstName = (name) => /^[A-Za-z\u0590-\u05FF]+$/.test(name); // רק אותיות באנגלית או עברית
  const validateLastName = (name) => /^[A-Za-z\u0590-\u05FF]+$/.test(name); // רק אותיות באנגלית או עברית
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); // אימייל בתבנית תקינה
  const validatePassword = (password) => /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/.test(password); // סיסמה עם אות גדולה, מספר וסימן מיוחד
  const validateId = (id) => /^[0-9]{9}$/.test(id); // תעודת זהות עם 9 ספרות
  const validateUsername = (username) => /^[A-Za-z0-9_\u0590-\u05FF]{3,20}$/.test(username); // בדיקת תקינות שם משתמש
  const validateBirthDate = (birthDate) => {
    const dateRegex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/(19|20)\d\d$/;
    const today = new Date();
    const [day, month, year] = birthDate.split('/').map(Number);
    const birthDateObj = new Date(year, month - 1, day);
    return dateRegex.test(birthDate) && birthDateObj <= today;
  }; // תאריך לידה בתבנית יום/חודש/שנה, לא יותר מהיום הנוכחי
  const validateOrganizationName = (name) => /^[A-Za-z\u0590-\u05FF\s]+$/.test(name);  const validateOrganizationPurpose = (purpose) => /^[A-Za-z\u0590-\u05FF\s]+$/.test(purpose); // רק אותיות עבור מטרת הארגון

  const handleSignUp = async () => {
    // בדיקת תקינות לשם משתמש
    if (!username || !validateUsername(username)) {
      alert('שם משתמש חייב להכיל 3-20 תווים (אותיות, מספרים וקו תחתון בלבד)');
      return;
    }
    
    // בדיקות תקינות נוספות
    if (!email || !validateEmail(email)) {
      alert('בבקשה הזן אימייל תקני');
      return;
    }
    if (!password ) {
      alert('הסיסמה חייבת להכיל לפחות 6 תווים, אות גדולה, מספר וסימן מיוחד');
      return;
    }
    if (!id || !validateId(id)) {
      alert('תעודת זהות חייבת להיות בת 9 ספרות');
      return;
    }
    if (!firstName ) {
      alert('שם פרטי יכול לכלול רק אותיות באנגלית או עברית');
      return;
    }
    if (!lastName || !validateLastName(lastName)) {
      alert('שם משפחה יכול לכלול רק אותיות באנגלית או עברית');
      return;
    }
    if (!birthDate || !validateBirthDate(birthDate)) {
      alert('תאריך לידה לא תקני או מעבר לתאריך הנוכחי');
      return;
    }

    if (isOrganization) {
      if (!organizationName || !validateOrganizationName(organizationName)) {
        alert('שם הארגון יכול לכלול רק אותיות באנגלית או עברית');
        return;
      }
      if (!organizationPurpose || !validateOrganizationPurpose(organizationPurpose)) {
        alert('מטרת הארגון יכולה לכלול רק אותיות באנגלית או עברית');
        return;
      }
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userData = {
        id,
        username, // הוספת שם המשתמש למידע שנשמר
        firstName,
        lastName,
        birthDate,
        gender,
        isOrganization,
        ...(isOrganization && { organizationName, organizationPurpose }),
      };

      // Save user data in 'users' collection
      await setDoc(doc(db, 'users', user.uid), userData);

      // If the user is part of an organization, save organization data in 'organization' collection
      if (isOrganization) {
        const organizationData = {
          organizationName,
          organizationPurpose,
          userId: user.uid,
        };
        await setDoc(doc(db, 'organization', user.uid), organizationData);
      }

      alert('משתמש נוסף בהצלחה!');
      console.log('User created and additional data saved successfully!');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Sign up error:', error.message);
      alert('ישנה בעיה בהתחברות'); 
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/start.png')}
      style={styles.backgroundImage}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* לוגו מחוץ ל-ScrollView */}
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
              style={[styles.logoInContainer, { opacity }]}
            />
          </ImageBackground>
        </Animated.View>

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
            {/* Email input */}
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="אימייל"
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#7f8c8d"
            />

            {/* Username input - הוספת שדה שם משתמש */}
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="שם משתמש"
              autoCapitalize="none"
              placeholderTextColor="#7f8c8d"
              maxLength={20}
            />

            {/* Password input */}
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="סיסמה"
              secureTextEntry
              placeholderTextColor="#7f8c8d"
            />

            {/* ID input */}
            <TextInput
              style={styles.input}
              value={id}
              onChangeText={setId}
              placeholder="תעודת זהות"
              keyboardType="numeric"
              placeholderTextColor="#7f8c8d"
            />

            {/* First Name input */}
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={(text) => {
                // Regex: Only Hebrew, English letters and spaces
                const sanitizedText = text.replace(/[^א-תa-zA-Z\s]/g, '');
                setFirstName(sanitizedText);
              }}
              placeholder="שם פרטי"
            />

            {/* Last Name input */}
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="שם משפחה"
              placeholderTextColor="#7f8c8d"
            />

            {/* Birth Date input */}
            <TextInput
              style={styles.input}
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="תאריך לידה (DD/MM/YYYY)"
              placeholderTextColor="#7f8c8d"
            />

            {/* Gender selection */}
            <TouchableOpacity onPress={() => setIsModalVisible(true)}>
              <Text style={styles.input}>
                {gender ? `מגדר: ${gender}` : 'בחר מגדר'}
              </Text>
            </TouchableOpacity>

            {/* Gender modal */}
            <Modal
              visible={isModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setIsModalVisible(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalText}>בחר מגדר</Text>
                  <TouchableOpacity onPress={() => { setGender('זכר'); setIsModalVisible(false); }}>
                    <Text style={styles.modalOption}>זכר</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setGender('נקבה'); setIsModalVisible(false); }}>
                    <Text style={styles.modalOption}>נקבה</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>

            <View style={styles.switchContainer}>
              <Text style={styles.label}>האם אתה מייצג ארגון התנדבותי?</Text>
              <Switch
                value={isOrganization}
                onValueChange={setIsOrganization}
              />
            </View>

            {/* Organization details */}
            {isOrganization && (
              <>
                <TextInput
                  style={styles.input}
                  value={organizationName}
                  onChangeText={setOrganizationName}
                  placeholder="שם הארגון"
                  placeholderTextColor="#7f8c8d"
                />
                <TextInput
                  style={styles.input}
                  value={organizationPurpose}
                  onChangeText={setOrganizationPurpose}
                  placeholder="מטרת הארגון"
                  placeholderTextColor="#7f8c8d"
                />
              </>
            )}
          </ScrollView>
        </Animated.View>

        <Animated.View
          style={[
            styles.footer,
            { transform: [{ translateY: footerAnimation }] },
          ]}
        >
          <TouchableOpacity style={styles.button} onPress={handleSignUp}>
            <Text style={styles.buttonText}>הירשם</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Animated.Text
              style={[
                styles.toggleText,
                { transform: [{ translateY: toggleTextAnimation }] },
              ]}
            >
              כבר יש לך חשבון? היכנס
            </Animated.Text>
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
  formContainer: {
    flex: 0.8, // השתמש ב-flex: 1 כך שהקונטיינר יתפוס את כל הגובה שנותר
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.6)', // רקע קצת שקוף
    borderRadius: 40, // קצוות מעוגלות
    paddingTop: 15, // מרווח עליון
    paddingBottom: 15, // מרווח תחתון
    marginTop: 20, // מרווח עליון נוסף אם צריך
  },
  scrollContainer: {
    paddingBottom: 10,
  },
  scrollView: {
    paddingTop: 10,
  },
  logoContainer: {
    alignItems: 'center', // ממקם את הלוגו במרכז
    marginTop: 2, // שמתי מרווח שלילי כדי למקם את הלוגו טוב יותר
  },
  logoBackground: {
    width: 190,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
    marginTop:30,
    marginBottom:20,
  },
  logoInContainer: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
    backgroundColor: 'transparent',
    marginTop: -20,
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
    marginTop:10
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
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    color: '#34495e',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // רקע מטושטש
    writingDirection: 'rtl',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 40,
    writingDirection: 'rtl',
    width: '80%',
    elevation: 5, // צלליות למראה מודרני
  },
  modalText: {
    fontSize: 18,
    marginBottom: 15,
    textAlign: 'right',
    color: '#34495e',
  },
  modalOption: {
    fontSize: 18,
    color: '#2c6975',
    marginVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#bdc3c7', // פס בין הבחירות
    paddingBottom: 10,
    textAlign: 'right',
  },
});

export default SignUpScreen;