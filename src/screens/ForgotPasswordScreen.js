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
} from 'react-native';
import { sendPasswordResetEmail } from '@firebase/auth';
import { Ionicons } from '@expo/vector-icons';

const ForgotPasswordScreen = ({ auth, navigation }) => {
  const [email, setEmail] = useState('');
  const imageAnimation = useRef(new Animated.Value(0)).current;
  const logoContainerAnimation = useRef(new Animated.Value(-100)).current;
  const inputContainerAnimation = useRef(new Animated.Value(100)).current;

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

  const handleResetPassword = async () => {
    if (!email) {
      alert('תזין מייל אלקטרוני');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert('איפוס סיסמה נשלח למייל ');
      navigation.navigate('Login');
    } catch (error) {
      console.error('Password reset error:', error.message);
      alert('An error occurred while resetting password');
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/start.png')}
      style={styles.backgroundImage}
    >
      <View style={styles.container}>
        {/* Back Button */}
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

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
            styles.inputContainer,
            { transform: [{ translateY: inputContainerAnimation }] },
          ]}
        >
          <Text style={styles.title}>שכחתי סיסמה</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="אימייל"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#7f8c8d"
          />

          <TouchableOpacity onPress={handleResetPassword}>
            <View style={styles.button}>
              <Text style={styles.buttonText}>איפוס סיסמה</Text>
            </View>
          </TouchableOpacity>
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
  },
  backButton: {
    position: 'absolute',
    top: 70,
    left: 20,
    padding: 10,
    zIndex: 1,
  },
  logoBackground: {
    width: 190,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 10,
    marginTop:-190,
  },
  logoInContainer: {
    width: 90,
    height: 90,
    resizeMode: 'contain',
    backgroundColor: 'transparent',
    marginTop:-20,
  },
  inputContainer: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderRadius: 40,
    paddingVertical: 40,
    marginTop: -60,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
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
    elevation: 8,
    marginTop: 20,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
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
});

export default ForgotPasswordScreen;
