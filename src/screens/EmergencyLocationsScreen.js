import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function EmergencyLocationsScreen({ navigation }) {
  const [savedLocations, setSavedLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filteredLocations, setFilteredLocations] = useState([]);
  const [city, setCity] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const sessionToken = useRef(Math.random().toString(36).substring(2, 15));

  // אנימציות
  const translateY = useRef(new Animated.Value(-800)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const listItemAnimations = useRef([]).current;

  useEffect(() => {
    loadSavedLocations();
    
    // הפעלת אנימציות
    Animated.timing(translateY, {
      toValue: -690,
      duration: 1000,
      useNativeDriver: true,
    }).start();
    
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  // החל פילטרים בכל שינוי של חיפוש טקסט
  useEffect(() => {
    applyFilters();
  }, [savedLocations, searchText]);

  // עדכון אנימציות פריטי הרשימה
  useEffect(() => {
    if (filteredLocations.length > 0) {
      if (listItemAnimations.length !== filteredLocations.length) {
        listItemAnimations.length = 0;
        filteredLocations.forEach(() => {
          listItemAnimations.push(new Animated.Value(0));
        });
      }
      
      const animations = listItemAnimations.map((anim, index) => {
        return Animated.timing(anim, {
          toValue: 1,
          duration: 400,
          delay: index * 100,
          useNativeDriver: true,
        });
      });
      
      Animated.stagger(100, animations).start();
    }
  }, [filteredLocations]);

  const loadSavedLocations = async () => {
    try {
      setLoading(true);
      const userId = getAuth().currentUser?.uid;
      if (!userId) return;

      const userDoc = await getDoc(doc(getFirestore(), 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setSavedLocations(userData.emergencyLocations || []);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading saved locations:', error);
      setLoading(false);
      Alert.alert('שגיאה', 'לא ניתן לטעון את המיקומים השמורים');
    }
  };

  const saveLocation = async (newLocation) => {
    try {
      setLoading(true);
      const userId = getAuth().currentUser?.uid;
      if (!userId) return;

      const userDocRef = doc(getFirestore(), 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        Alert.alert('שגיאה', 'משתמש לא נמצא');
        setLoading(false);
        return;
      }

      const userData = userDoc.data();
      const currentLocations = userData.emergencyLocations || [];

      if (currentLocations.some(loc => loc.placeId === newLocation.placeId)) {
        Alert.alert('שגיאה', 'מיקום זה כבר קיים ברשימה');
        setLoading(false);
        return;
      }

      const updatedLocations = [...currentLocations, newLocation];

      await updateDoc(userDocRef, {
        emergencyLocations: updatedLocations
      });

      setSavedLocations(updatedLocations);
      setLoading(false);
      Alert.alert('הצלחה', 'המיקום נשמר בהצלחה');
    } catch (error) {
      console.error('Error saving location:', error);
      setLoading(false);
      Alert.alert('שגיאה', 'לא ניתן לשמור את המיקום');
    }
  };

  const removeLocation = async (placeId) => {
    Alert.alert(
      'מחיקת מיקום',
      'האם אתה בטוח שברצונך למחוק מיקום זה?',
      [
        {
          text: 'ביטול',
          style: 'cancel',
        },
        {
          text: 'מחק',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const userId = getAuth().currentUser?.uid;
              if (!userId) return;

              const userDocRef = doc(getFirestore(), 'users', userId);
              const userDoc = await getDoc(userDocRef);
              
              if (!userDoc.exists()) {
                Alert.alert('שגיאה', 'משתמש לא נמצא');
                setLoading(false);
                return;
              }

              const userData = userDoc.data();
              const currentLocations = userData.emergencyLocations || [];
              const updatedLocations = currentLocations.filter(loc => loc.placeId !== placeId);

              await updateDoc(userDocRef, {
                emergencyLocations: updatedLocations
              });

              setSavedLocations(updatedLocations);
              setLoading(false);
              Alert.alert('הצלחה', 'המיקום הוסר בהצלחה');
            } catch (error) {
              console.error('Error removing location:', error);
              setLoading(false);
              Alert.alert('שגיאה', 'לא ניתן להסיר את המיקום');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  useEffect(() => {
    const fetchPredictions = async () => {
      if (city.length > 1) {
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${city}&language=he&components=country:il&types=(cities)&key=AIzaSyB07kE_rkZtWdabbSVwRrfRYcHukMeYzx0&sessiontoken=${sessionToken.current}`
          );
          const data = await response.json();
          
          if (data.status === 'OK') {
            setPredictions(data.predictions);
            setShowPredictions(true);
          } else {
            setPredictions([]);
            setShowPredictions(false);
          }
        } catch (error) {
          console.error("Error fetching predictions:", error);
        }
      } else {
        setPredictions([]);
        setShowPredictions(false);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchPredictions();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [city]);

  const selectPrediction = async (placeId, description) => {
    sessionToken.current = Math.random().toString(36).substring(2, 15);
    setCity(description);
    setShowPredictions(false);
    
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,name&key=AIzaSyB07kE_rkZtWdabbSVwRrfRYcHukMeYzx0&sessiontoken=${sessionToken.current}`
      );
      const data = await response.json();

      if (data.status === 'OK') {
        const location = data.result.geometry.location;
        const newLocation = {
          placeId: placeId,
          name: data.result.name,
          latitude: location.lat,
          longitude: location.lng,
        };
        saveLocation(newLocation);
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
    }
  };

  const applyFilters = () => {
    if (!savedLocations.length) {
      setFilteredLocations([]);
      return;
    }
    
    let result = [...savedLocations];
    
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(location => 
        location.name.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredLocations(result);
  };

  const renderLocationItem = ({ item, index }) => {
    const itemAnimation = listItemAnimations[index] || new Animated.Value(1);
    
    return (
      <Animated.View
        style={{
          opacity: itemAnimation,
          transform: [
            { translateY: itemAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0]
              })
            }
          ]
        }}
      >
        <View style={styles.locationCard}>
          <LinearGradient
            colors={['rgba(44, 105, 117, 0.05)', 'rgba(79, 157, 166, 0.1)', 'rgba(44, 105, 117, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          />
          <View style={styles.locationInfo}>
            <View style={styles.locationMainInfo}>
              <View style={styles.locationTextInfo}>
                <Text style={styles.locationName}>{item.name}</Text>
              </View>
              <View style={styles.locationIcon}>
                <Ionicons name="location" size={24} color="#2c6975" />
              </View>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]} 
                onPress={() => removeLocation(item.placeId)}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>מחיקה</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.resultCount}>
        נמצאו {filteredLocations.length} מיקומים
      </Text>
    </View>
  );

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
        <Text style={styles.title}>מיקומים לחירום</Text>
      </View>
      
      {/* תיבת חיפוש */}
      <Animated.View 
        style={[styles.searchContainer, { opacity: fadeAnim }]}
      >
        <TextInput
          style={styles.searchInput}
          placeholder="חפש עיר..."
          value={city}
          onChangeText={setCity}
          textAlign="right"
        />
        <Ionicons name="search" size={24} color="#2c6975" />
      </Animated.View>
      
      {/* תיאור המסך */}
      <Animated.View style={[styles.descriptionContainer, { opacity: fadeAnim }]}>
        <Text style={styles.description}>
הגדר מיקומים נוספים שתקבל עליהם התראה בזמן חירום         </Text>
      </Animated.View>
      
      {/* רשימת המיקומים המסוננת */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {loading ? (
          <ActivityIndicator size="large" color="#2c6975" style={styles.loader} />
        ) : (
          <FlatList
            data={filteredLocations}
            renderItem={renderLocationItem}
            keyExtractor={(item) => item.placeId}
            contentContainerStyle={styles.list}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={styles.emptyTitle}>לא נמצאו מיקומים</Text>
                <Text style={styles.emptyText}>הקלד שם עיר כדי להוסיף מיקום חדש</Text>
              </View>
            }
          />
        )}
      </Animated.View>

      {/* רשימת ההצעות */}
      {showPredictions && predictions.length > 0 && (
        <View style={styles.predictionsContainer}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.predictionItem}
                onPress={() => selectPrediction(item.place_id, item.description)}
              >
                <Text style={styles.predictionText}>{item.description}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

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
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    height: 40,
    padding: 8,
    textAlign: 'right',
    color: '#34495e',
    fontWeight: '500',
  },
  descriptionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: '#2c6975',
    textAlign: 'center',
    fontWeight: '500',
  },
  list: {
    paddingBottom: 20,
  },
  listHeader: {
    padding: 10,
    backgroundColor: 'rgba(44, 105, 117, 0.1)',
    borderRadius: 10,
    marginVertical: 10,
  },
  resultCount: {
    color: '#2c6975',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  locationCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  cardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  locationInfo: {
    flex: 1,
  },
  locationMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  locationIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(44, 105, 117, 0.1)',
    marginLeft: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationTextInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  locationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c6975',
    marginBottom: 5,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginLeft: 10,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 5,
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: '#e74c3c',
  },
  emptyList: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c6975',
    marginBottom: 10,
  },
  emptyText: {
    color: '#2c6975',
    fontSize: 16,
    textAlign: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  predictionsContainer: {
    position: 'absolute',
    top: 180,
    left: 16,
    right: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    zIndex: 2,
    maxHeight: 200,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  predictionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  predictionText: {
    fontSize: 14,
    textAlign: 'right',
  },
}); 