import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, ImageBackground, Animated, Image, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { getAuth, signOut } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const LikedVolunteerings = ({ navigation }) => {
  const [likedVolunteerings, setLikedVolunteerings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const animationValues = useRef([]);
  const translateY = useRef(new Animated.Value(-1000)).current;
  const titleAnimation = useRef(new Animated.Value(0)).current;
  const buttonAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const db = getFirestore();
  const auth = getAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace('Login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    Animated.sequence([
      Animated.timing(translateY, {
        toValue: height * -0.8,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(titleAnimation, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      })
    ]).start();

    buttonAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: index * 300,
        useNativeDriver: true,
      }).start();
    });
  }, [translateY, buttonAnimations]);

  useEffect(() => {
    const fetchLikedVolunteerings = async () => {
      const user = auth.currentUser;
      if (!user) return;

      try {
        const q = query(collection(db, 'likedVolunteerings'), where('userId', '==', user.uid));
        const querySnapshot = await getDocs(q);
        const volunteeringsList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLikedVolunteerings(volunteeringsList);
      } catch (error) {
        console.error('Error fetching liked volunteerings:', error);
        Alert.alert('שגיאה בטעינת ההתנדבויות האהובות');
      } finally {
        setLoading(false);
      }
    };

    fetchLikedVolunteerings();
  }, [db, auth]);

  const handleUnlikeVolunteering = async (volunteeringId) => {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const q = query(
        collection(db, 'likedVolunteerings'),
        where('userId', '==', user.uid),
        where('volunteeringId', '==', volunteeringId)
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });

      setLikedVolunteerings((prev) =>
        prev.filter((volunteering) => volunteering.volunteeringId !== volunteeringId)
      );
    } catch (error) {
      console.error('Error unliking volunteering:', error);
      Alert.alert('שגיאה בהסרת ההתנדבות מרשימת האהובות');
    }
  };

  const renderVolunteering = ({ item, index }) => {
    if (!animationValues.current[index]) {
      animationValues.current[index] = new Animated.Value(0);
    }

    Animated.timing(animationValues.current[index], {
      toValue: 1,
      duration: 400,
      delay: index * 300,
      useNativeDriver: true,
    }).start();

    return (
      <Animated.View style={[styles.card, { opacity: animationValues.current[index] }]}>
        <TouchableOpacity style={styles.card}>
          <View style={styles.square}>
            <Text style={[styles.squareText, { textAlign: 'right', fontWeight: 'bold' }]}>
              {item.title || 'לא זמין'}
            </Text>
            <Text style={[styles.squareText, { textAlign: 'right' }]}>
              {item.location?.city || 'לא זמין'}
            </Text>
            <Text style={[styles.squareText, { textAlign: 'right' }]}>
              {item.date ? new Date(item.date).toLocaleString('he-IL') : 'לא זמין'}
            </Text>
            <TouchableOpacity
              style={styles.likeButton}
              onPress={() => handleUnlikeVolunteering(item.volunteeringId)}
            >
              <Ionicons name="heart" size={24} color="red" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <ImageBackground source={require('../../assets/all2.png')} style={styles.backgroundImage}>
      <View style={styles.container}>
        <Animated.View
          style={[
            styles.halfCircle,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <LinearGradient
            colors={['#ff5757', '#8c52ff', '#ff5757']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          />
        </Animated.View>

        <Animated.Text
          style={[
            styles.circleTitle,
            {
              opacity: titleAnimation,
              transform: [
                {
                  translateY: titleAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          התנדבויות אהובות
        </Animated.Text>

        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <FlatList
          data={likedVolunteerings}
          keyExtractor={(item) => item.id}
          renderItem={renderVolunteering}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'flex-end' }}
          contentContainerStyle={{ direction: 'rtl', paddingTop: 80 }}
        />
        {likedVolunteerings.length === 0 && !loading && (
          <Text style={styles.noLikedText}>לא סימנת אף התנדבות</Text>
        )}

        {isMenuOpen && (
          <View style={styles.menu}>
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Text style={styles.menuText}>התנתקות</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

     
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    marginTop: 50,
    direction: 'rtl',
    paddingBottom: 70,
  },
  backgroundImage: {
    flex: 1,
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  backButton: {
    padding: 10,
    marginBottom: 20,
  },
  card: {
    flex: 1,
  },
  square: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 10,
    width: 185,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 5,
    elevation: 5,
    shadowColor: '#a6a6a6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
  },
  squareText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  likeButton: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  noLikedText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginTop: 70,
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
    flexDirection: 'row-reverse',
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
  },
  menuItem: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
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
  circleTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    position: 'absolute',
    top: 100,
    width: '100%',
    zIndex: 1,
    marginRight: 20,
    marginTop: -40,
  },
});

export default LikedVolunteerings;
