import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Animated, Image, ImageBackground, Platform, KeyboardAvoidingView, Dimensions } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore'; 
import { getFirestore } from 'firebase/firestore'; 
import { getAuth, updatePassword, signOut } from 'firebase/auth'; 
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const EditProfile_general = ({ route, navigation }) => {
  const { userId } = route.params;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);

  const db = getFirestore();
  const auth = getAuth();

  // אנימציות
  const translateY = useRef(new Animated.Value(-800)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const formContainerAnimation = useRef(new Animated.Value(100)).current;

  const logoAnimation = useRef(new Animated.Value(0)).current;
  const logoContainerAnimation = useRef(new Animated.Value(-100)).current;

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };
  const handleLogout = async () => {
    try {
      const auth = getAuth(); // מקבל את מופע האימות של Firebase
      await signOut(auth); // מתנתק מהמשתמש
      navigation.replace('Login'); // ניתוב לדף ההתחברות
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  const navigateToWhatToDo = () => navigation.navigate('WhatToDo', { userId: userId });

  const navigateToEditProfile = () => {
    const user = auth.currentUser;
    if (user) {
      navigation.navigate('EditProfile_general', { userId: user.uid });
    }
  };

  const navigateToHomePage = () => {
    const user = auth.currentUser;
    if (user) {
      navigation.navigate('HomePage', { userId: user.uid });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userDocRef = doc(db, 'users', userId);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          setFirstName(userData.firstName || '');
          setLastName(userData.lastName || '');
          setBirthDate(userData.birthDate || '');
        } else {
          console.error('No such user document!');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, db]);

  const handleSave = async () => {
    // Validation logic...
    try {
      const updatedUserData = {};
  
      // בודק אם יש שדה לא ריק, אם כן, מעדכן אותו
      if (firstName) updatedUserData.firstName = firstName;
      if (lastName) updatedUserData.lastName = lastName;
      if (birthDate) updatedUserData.birthDate = birthDate;
      if (password) updatedUserData.password = password;
  
      // אם יש שדות שהשתנו, מבצע עדכון במסד הנתונים
      if (Object.keys(updatedUserData).length > 0) {
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, updatedUserData);
  
        // אם הוזנה סיסמה חדשה, מעדכן גם את הסיסמה
        if (password) {
          const user = auth.currentUser;
          if (user) {
            await updatePassword(user, password);
          }
        }
  
        alert('הפרופיל עודכן בהצלחה');
        navigation.goBack();
      } else {
        alert('לא בוצעו שינויים');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('שגיאה בעדכון פרופיל');
    }
  };
  

  useEffect(() => {
    // הפעלת אנימציות
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -690,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(formContainerAnimation, {
        toValue: 0,
        duration: 1400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  

 

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
        <Text style={styles.title}>עריכת פרופיל</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View
          style={[
            styles.formContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: formContainerAnimation }],
            },
          ]}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={(text) => {
                const sanitizedText = text.replace(/[^א-תa-zA-Z\s]/g, '');
                setFirstName(sanitizedText);
              }}
              placeholder="שם פרטי"
              placeholderTextColor="#7f8c8d"
            />
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="שם משפחה"
              placeholderTextColor="#7f8c8d"
            />
            <TextInput
              style={styles.input}
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="תאריך לידה (DD/MM/YYYY)"
              placeholderTextColor="#7f8c8d"
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="סיסמה חדשה"
              secureTextEntry
              placeholderTextColor="#7f8c8d"
            />

            <TouchableOpacity style={styles.button} onPress={handleSave}>
              <LinearGradient
                colors={['#2c6975', '#4f9da6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>שמור שינויים</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {isMenuOpen && (
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Text style={styles.menuText}>התנתקות</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
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
  formContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  scrollContainer: {
    padding: 10,
  },
  input: {
    width: '100%',
    padding: 15,
    marginVertical: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    fontSize: 16,
    color: '#34495e',
    textAlign: 'right',
  },
  button: {
    marginTop: 20,
    borderRadius: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonGradient: {
    padding: 15,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  menu: {
    position: 'absolute',
    bottom: 73,
    right: 10,
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 5,
  },
  menuItem: {
    padding: 15,
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
});

export default EditProfile_general;
