import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  Text,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getAuth, signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';

const { width, height } = Dimensions.get('window');

const WhatToDo = ({ navigation, route }) => {
  // קבלת הפרמטרים מהניווט
  const { source, childData } = route.params || {};
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isVideoModalVisible, setIsVideoModalVisible] = useState(false);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState('');
  const [currentImage, setCurrentImage] = useState(null);

  const translateY = useRef(new Animated.Value(-1000)).current;
  const fadeInContent = useRef(new Animated.Value(0)).current;
  const sectionAnimations = useRef(Array.from({ length: 12 }, () => new Animated.Value(0))).current;
  
  // פונקציית ניווט לדף הבית המתאים
  const navigateToHomePage = () => {
    if (source === 'HomePage_kids' && childData) {
      // אם הגיעו מדף הילדים, חזור לשם עם נתוני הילד
      navigation.navigate('HomePage_kids', { childData });
    } else {
      // ברירת מחדל - חזור לדף המבוגר
      navigation.navigate('HomePage');
    }
  };
  
  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigation.replace('Login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };
  
  // פונקציה לפתיחת המודל של הסרטון
  const openVideoModal = (videoId) => {
    setCurrentVideoUrl(`https://www.youtube.com/embed/${videoId}`);
    setIsVideoModalVisible(true);
  };

  const closeVideoModal = () => {
    setIsVideoModalVisible(false);
    setCurrentVideoUrl('');
  };

  // פונקציה לפתיחת המודל של התמונה
  const openImageModal = (imageSource) => {
    setCurrentImage(imageSource);
    setIsImageModalVisible(true);
  };

  const closeImageModal = () => {
    setIsImageModalVisible(false);
    setCurrentImage(null);
  };

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: height * -0.8,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    Animated.timing(fadeInContent, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    sectionAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 800,
        delay: 300 + index * 150,
        useNativeDriver: true,
      }).start();
    });
  }, [translateY, fadeInContent, sectionAnimations]);

  const footerButtonAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    footerButtonAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: index * 300,
        useNativeDriver: true,
      }).start();
    });
  }, [footerButtonAnimations]);

  // התמונה שתוצג במודל של מלבן 12
  const emergencyNumbersImage = require('../../assets/emergency_numbers.png'); // יש להוסיף את התמונה המתאימה לפרויקט

  // פרטי המלבנים עם פונקציית הניווט הספציפית
  const rectangles = [
    { 
      image: require('../../assets/whattodo/1.png'), 
      action: () => openVideoModal('sHfOC6FqrDI')
    },
    { 
      image: require('../../assets/whattodo/2.png'), 
      action: () => openVideoModal('GuEeWngifas')
    },
    { 
      image: require('../../assets/whattodo/3.png'), 
      action: () => openVideoModal('Jc5CYni0Fyc')
    },
    { 
      image: require('../../assets/whattodo/4.png'), 
      action: () => openVideoModal('IN8akHDSeSc')
    },
    { 
      image: require('../../assets/whattodo/5.png'), 
      action: () => openVideoModal('9BMH_58WOEI')
    },
    { 
      image: require('../../assets/whattodo/6.png'), 
      action: () => openVideoModal('PZQcgJYqzB0')
    },
    { 
      image: require('../../assets/whattodo/7.png'), 
      action: () => openVideoModal('4uZgEhystxE')
    },
    { 
      image: require('../../assets/whattodo/8.png'), 
      action: () => openVideoModal('5DhJr3uwIF0')
    },
    { 
      image: require('../../assets/whattodo/9.png'), 
      action: () => openVideoModal('GuEeWngifas')
    },
    { 
      image: require('../../assets/whattodo/10.png'), 
      action: () => openVideoModal('jaQ2lTTD03A')
    },
    { 
      image: require('../../assets/whattodo/11.png'), 
      action: () => openVideoModal('OS6t0VhgAHs')
    },
    { 
      image: require('../../assets/whattodo/12.png'), 
      // במלבן 12, נשתמש בפונקציה לפתיחת המודל של התמונה במקום סרטון
      action: () => openImageModal(emergencyNumbersImage)
    },
  ];

  return (
    <View style={styles.container}>
      {/* Background */}
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>מה עלי לעשות?</Text>
      </View>

      {/* Content */}
      <Animated.View style={[styles.contentContainer, { opacity: fadeInContent }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          {rectangles.map((item, index) => (
            <Animated.View
              key={index}
              style={[
                styles.rectangle,
                {
                  opacity: sectionAnimations[index],
                  transform: [
                    {
                      translateY: sectionAnimations[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                style={styles.rectangleButton}
                onPress={item.action}
              >
                <Image source={item.image} style={styles.rectangleImage} />
              </TouchableOpacity>
            </Animated.View>
          ))}
          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>

      {/* Video Modal */}
      <Modal
        transparent={true}
        visible={isVideoModalVisible}
        onRequestClose={closeVideoModal}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeVideoModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#446678" />
              </TouchableOpacity>
            </View>
            <WebView
              source={{ uri: currentVideoUrl }}
              style={styles.video}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              allowsFullscreenVideo={true}
            />
          </SafeAreaView>
        </View>
      </Modal>

      {/* Image Modal */}
      <Modal
        transparent={true}
        visible={isImageModalVisible}
        onRequestClose={closeImageModal}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <SafeAreaView style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeImageModal} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#446678" />
              </TouchableOpacity>
            </View>
            <Image source={currentImage} style={styles.modalImage} resizeMode="contain" />
          </SafeAreaView>
        </View>
      </Modal>

      {/* Menu overlay */}
      {isMenuOpen && (
        <View style={styles.menu}>
          <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
            <Text style={styles.menuText}>התנתקות</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Footer */}
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efefef',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
    textAlign: 'center',
    fontFamily: 'Roboto',
    marginBottom: -140,
  },
  backButton: {
    position: 'absolute',
    left: 15,
    top: 60,
    padding: 10,
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
  contentContainer: {
    flex: 1,
    marginTop: 200,
    zIndex: 1,
    marginBottom: 100,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollViewContent: {
    paddingTop: 20,
    alignItems: 'center',
  },
  rectangle: {
    width: width - 40,
    marginBottom: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  rectangleButton: {
    width: '100%',
    height: 150,
  },
  rectangleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    height: '80%',
    backgroundColor: 'white',
    borderRadius: 15,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  closeButton: {
    padding: 5,
  },
  video: {
    flex: 1,
  },
  modalImage: {
    flex: 1,
    width: '100%',
  },
  menu: {
    position: 'absolute',
    bottom: 73,
    right: 10,
    width: 150,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    writingDirection: 'rtl',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    zIndex: 100,
  },
  menuItem: {
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
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
    marginTop: -10,
  },
  footerIcon: {
    width: 30,
    height: 30,
  },
});

export default WhatToDo;
