import React, { useRef, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  Text,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const Kids_zone = ({ navigation }) => {
  const navigateToHomePage = () => navigation.navigate('HomePage');
  const navigateToWhatToDo = () => navigation.navigate('WhatToDo');

  // אנימציה לעיגול
  const translateY = useRef(new Animated.Value(-800)).current;

  // אנימציות לכפתורים בפוטר
  const buttonAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  // אפקטים של אנימציות
  useEffect(() => {
    // עיגול יורד למרכז
    Animated.timing(translateY, {
      toValue: height * -0.6,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // כפתורים בפוטר מופיעים אחד אחרי השני
    buttonAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: index * 200, // עיכוב בין כפתור לכפתור
        useNativeDriver: true,
      }).start();
    });
  }, [translateY, buttonAnimations]);

  return (
    <ImageBackground
      source={require('../../assets/kids.png')} // נתיב לתמונה שלך
      style={styles.background}
    >
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
    colors={['#fa00e9', '#ffef57', '#fa00e9']}
    locations={[0, 0.5, 1]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[styles.gradient, { zIndex: 0 }]} // הגדרת zIndex גם לגרדיאנט
  />
  <View style={styles.halfCircleTextContainer}>
  <Text style={styles.halfCircleText_title}>Kids Zone</Text>

    <Text style={styles.halfCircleText}>Coming Soon...</Text>
  </View>
</Animated.View>

        {/* תוכן */}
        <View style={styles.content}>
          {/* אזור גלילה או תוכן */}
          {/* ניתן להוסיף כאן את התוכן הרצוי */}
        </View>

        {/* פוטר עם גרדיאנט */}
        <View style={styles.footer}>
          <LinearGradient
            colors={['#fa00e9', '#ffef57', '#fa00e9']}
            locations={[0, 0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.footerGradient}
          >
            {/* כפתורים עם אנימציה */}
            {buttonAnimations.map((anim, index) => (
              <Animated.View
                key={index}
                style={{
                  opacity: anim,
                  transform: [{ scale: anim }],
                }}
              >
                <TouchableOpacity
  onPress={
    index === 0
      ? navigateToHomePage
      : index === 1
      ? navigateToWhatToDo
      : () => {}  // פונקציה ריקה כאן למקרה של index 2
  }
  style={styles.footerButton}
>
  <Image
    source={
      index === 0
        ? require('../../assets/house.png')
        : index === 1
        ? require('../../assets/mark.png')
        : index === 2
        ? require('../../assets/love-2.png')
        : require('../../assets/menu.png')
    }
    style={styles.footerIcon}
  />
</TouchableOpacity>
              </Animated.View>
            ))}
          </LinearGradient>
        </View>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover', // התאמת התמונה לגודל המסך
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
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
  halfCircleTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    zIndex: 1, // וודא שהטקסט נמצא מעל כל הרכיבים
  },
  halfCircleText_title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff', // לוודא שהצבע מספיק בולט
    textAlign: 'center',
    textShadowColor: '#000', // הוספת צל לטקסט על מנת להדגיש אותו
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
    marginTop:500,
    marginBottom:100,
  },
  halfCircleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff', // לוודא שהצבע מספיק בולט
    textAlign: 'center',
    textShadowColor: '#000', // הוספת צל לטקסט על מנת להדגיש אותו
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  footer: {
    width: '100%',
    height: 70,
    position: 'absolute',
    bottom: 0,
    overflow: 'hidden',
  },
  footerGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  footerButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerIcon: {
    width: 30,
    height: 30,
  },
});

export default Kids_zone;
