import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Animated, Linking, Image, TextInput, FlatList } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { ActivityIndicator } from 'react-native';
import { Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export default function App({ navigation }) {
  const [location, setLocation] = useState(null);
  const [searchedLocation, setSearchedLocation] = useState([]);
  const [showDirections, setShowDirections] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isOrganization, setIsOrganization] = useState(false);
  const [city, setCity] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const rotateValue = new Animated.Value(0);
  const [textPosition] = useState(new Animated.Value(100));
  const sessionToken = useRef(Math.random().toString(36).substring(2, 15));

  useEffect(() => {
    const getLocation = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setLocation(location.coords);
        handleSearch(location.coords);
      } catch (error) {
        console.error("Error getting location:", error);
      }
    };

    getLocation();

    Animated.loop(
      Animated.timing(rotateValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  useEffect(() => {
    // Fetch predictions when the city input changes
    const fetchPredictions = async () => {
      if (city.length > 1) {
        try {
          // השינוי העיקרי: הסרת סוג (cities) כדי לכלול גם רחובות
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${city}&language=he&components=country:il&key=AIzaSyB07kE_rkZtWdabbSVwRrfRYcHukMeYzx0&sessiontoken=${sessionToken.current}`
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

    // Add a delay to prevent too many API calls
    const timeoutId = setTimeout(() => {
      fetchPredictions();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [city]);

  // פונקציה לפרטי המיקום יחד עם סוג המיקום (עיר/רחוב)
  const getLocationDetails = (prediction) => {
    // בדיקה אם התוצאה מכילה סוגי מקומות
    if (prediction.types) {
      // בדיקה אם זה רחוב
      if (prediction.types.includes('route')) {
        return { main: prediction.structured_formatting.main_text, secondary: prediction.structured_formatting.secondary_text, type: 'רחוב' };
      }
      // בדיקה אם זו עיר
      else if (prediction.types.includes('locality')) {
        return { main: prediction.structured_formatting.main_text, secondary: prediction.structured_formatting.secondary_text, type: 'עיר' };
      }
    }
    
    // ברירת מחדל - החזרת התיאור המלא
    return { main: prediction.description, secondary: '', type: 'מקום' };
  };

  const handleSearch = async (coords) => {
    if (!coords) {
      alert('מיקום לא נמצא');
      return;
    }

    const { latitude, longitude } = coords;
    try {
      const response = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=1000&keyword=מקלט&type=shelter&language=he&key=_`);
      const data = await response.json();
      
      console.log(data.results);

      if (data.status === 'OK') {
        const locations = data.results.map(result => ({
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
          name: result.name,
          icon: result.icon,
        }));

        setSearchedLocation(locations);
      } else {
        alert('לא נמצאו מקלטים');
      }
    } catch (error) {
      console.error("Error fetching shelters:", error);
    }
  };

  const checkUserOrganizationStatus = async () => {
    const user = getAuth().currentUser;
    if (user) {
      const db = getFirestore();
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setIsOrganization(userData.isOrganization === true);
      }
    }
  };

  useEffect(() => {
    checkUserOrganizationStatus();
  }, []);

  const goToHomePage = () => {
    if (isOrganization) {
      navigation.navigate('HomePage_organ');
    } else {
      navigation.navigate('HomePage');
    }
  };

  const selectPrediction = async (placeId, description) => {
    // Generate a new session token when a place is selected
    sessionToken.current = Math.random().toString(36).substring(2, 15);
    
    setCity(description);
    setShowPredictions(false);
    
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=AIzaSyB07kE_=${sessionToken.current}`
      );
      const data = await response.json();

      if (data.status === 'OK') {
        const location = data.result.geometry.location;
        const regionConfig = {
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
          name: description,
        };
        setSelectedLocation(regionConfig);

        // חיפוש מקלטים באזור המיקום הנבחר
        try {
          const shelterResponse = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=1000&keyword=מקלט&type=shelter&language=he&key=AIzaSyB07kE_`);
          const shelterData = await shelterResponse.json();

          if (shelterData.status === 'OK') {
            const shelterLocations = shelterData.results.map(result => ({
              latitude: result.geometry.location.lat,
              longitude: result.geometry.location.lng,
              name: result.name,
              icon: result.icon,
            }));

            setSearchedLocation(shelterLocations);
          } else {
            alert('לא נמצאו מקלטים באזור הנבחר');
          }
        } catch (error) {
          console.error("Error fetching shelters:", error);
        }
      }
    } catch (error) {
      console.error("Error fetching place details:", error);
    }
  };

  const handleCitySearch = async () => {
    if (city) {
      const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${city}&key=AIzaSyB07kE_rkZtWdabbSVwRrfRYcHukMeYzx0`);
      const data = await response.json();

      if (data.status === 'OK') {
        const location = data.results[0].geometry.location;
        const regionConfig = {
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
          name: city,
        };
        setSelectedLocation(regionConfig);

        // חיפוש מקלטים באזור העיר
        try {
          const shelterResponse = await fetch(`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${location.lat},${location.lng}&radius=1000&keyword=מקלט&type=shelter&language=he&key=AIzaSyB07kE_`);
          const shelterData = await shelterResponse.json();

          if (shelterData.status === 'OK') {
            const shelterLocations = shelterData.results.map(result => ({
              latitude: result.geometry.location.lat,
              longitude: result.geometry.location.lng,
              name: result.name,
              icon: result.icon,
            }));

            setSearchedLocation(shelterLocations);
          } else {
            alert('לא נמצאו מקלטים באזור הנבחר');
          }
        } catch (error) {
          console.error("Error fetching shelters:", error);
        }
      } else {
        alert('לא נמצא המיקום');
      }
    }
  };

  const showDirectionsAnimation = () => {
    textPosition.setValue(100); 
    
    Animated.timing(textPosition, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    if (showDirections && selectedLocation) {
      showDirectionsAnimation();
    }
  }, [showDirections, selectedLocation]);

  const closeDirections = () => {
    setShowDirections(false);
    textPosition.setValue(100);
  };

  if (!location) {
    const rotate = rotateValue.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <View style={styles.loadingContainer}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <ActivityIndicator size="large" color="#12405a" />
        </Animated.View>
        <Text>מחכה למיקום...</Text>
      </View>
    );
  }

  const region = searchedLocation.length > 0 ? { latitude: searchedLocation[0].latitude, longitude: searchedLocation[0].longitude } : location;

  const regionConfig = {
    latitude: region.latitude,
    longitude: region.longitude,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  const openDirections = (latitude, longitude, name) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${latitude},${longitude}(${name})`,
      android: `google.navigation:q=${latitude},${longitude}`,
    });

    Linking.openURL(url).catch((err) => console.error("Failed to open maps: ", err));
  };

  const moveToCurrentLocation = () => {
    setShowDirections(false);
    const currentRegion = {
      latitude: location.latitude,
      longitude: location.longitude,
      latitudeDelta: 0.001,
      longitudeDelta: 0.001,
    };
    setSelectedLocation(currentRegion);
    handleSearch(location);
  };

  return (
    <View style={{ flex: 1 }}>
      {/* שדה חיפוש */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="חפש מיקום (עיר/רחוב)"
          value={city}
          onChangeText={setCity}
        />
        <TouchableOpacity onPress={handleCitySearch}>
          <Text style={styles.searchButton}>חפש</Text>
        </TouchableOpacity>
      </View>

      {/* Predictions list */}
      {showPredictions && predictions.length > 0 && (
        <View style={styles.predictionsContainer}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => {
              const locationInfo = getLocationDetails(item);
              return (
                <TouchableOpacity
                  style={styles.predictionItem}
                  onPress={() => selectPrediction(item.place_id, item.description)}
                >
                  <View style={styles.predictionContent}>
                    <Text style={styles.predictionType}>{locationInfo.type}</Text>
                    <View style={styles.predictionTextContainer}>
                      <Text style={styles.predictionMainText}>{locationInfo.main}</Text>
                      {locationInfo.secondary ? (
                        <Text style={styles.predictionSecondaryText}>{locationInfo.secondary}</Text>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      <MapView
        style={StyleSheet.absoluteFillObject}
        region={selectedLocation || regionConfig}
        onRegionChangeComplete={(region) => {
          if (!selectedLocation) {
            setSelectedLocation(region);
          }
        }}
      >
        {/* Marker for current location */}
        <Marker
          coordinate={{ latitude: location.latitude, longitude: location.longitude }}
          pinColor="#db0000"
        />

        {/* Marker for searched location */}
        {selectedLocation && (
          <Marker
            coordinate={{ latitude: selectedLocation.latitude, longitude: selectedLocation.longitude }}
            pinColor="#ff0000"
            title={selectedLocation.name || "מיקום נבחר"}
          />
        )}

        {/* Markers for shelters */}
        {searchedLocation.map((location, index) => (
          <Marker
            key={index}
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            onPress={() => {
              setShowDirections(true);
              setSelectedLocation({
                latitude: location.latitude,
                longitude: location.longitude,
                name: location.name,
              });
              showDirectionsAnimation();
            }}
            icon={{ uri: location.icon }}
            pinColor="#255f47"
          />
        ))}
      </MapView>

      {showDirections && selectedLocation && (
        <Animated.View style={[styles.directionsContainer, { transform: [{ translateY: textPosition }] }]}>
          <TouchableOpacity onPress={closeDirections} style={styles.closeButton}>
            <Icon name="close" size={30} color="#grey" />
          </TouchableOpacity>
          <Text>{`האם אתה רוצה לקבל הוראות הגעה ל-${selectedLocation.name}?`}</Text>
          <TouchableOpacity onPress={() => openDirections(selectedLocation.latitude, selectedLocation.longitude, selectedLocation.name)}>
            <Text style={styles.directionsText}>לחץ כאן להוראות הגעה</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      <View style={styles.footer}>
        <TouchableOpacity onPress={moveToCurrentLocation}>
          <Image
            source={require('../../assets/location-5.png')}
            style={styles.iconStyle}
          />
        </TouchableOpacity>
      </View>

      {/* Back Arrow Button */}
      <View style={styles.backButton}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchContainer: {
    position: 'absolute',
    top: 67,
    left: 85,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 20,
    zIndex: 1,
    width: '75%', 
    writingDirection: 'rtl',
  },
  searchInput: {
    flex: 1,
    padding: 5,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#fff',
    writingDirection: 'rtl',
  },
  searchButton: {
    padding: 10,
    backgroundColor: '#9cdd64',
    color: '#fff',
    borderRadius: 5,
    marginLeft: 10,
  },
  predictionsContainer: {
    position: 'absolute',
    top: 120, // Position it right below the search input
    left: 85,
    right: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    zIndex: 2,
    maxHeight: 200,
    width: '75%',
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
  predictionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end', // לסידור מימין לשמאל
  },
  predictionType: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    fontSize: 10,
    marginLeft: 8,
    color: '#505050',
  },
  predictionTextContainer: {
    flex: 1,
    alignItems: 'flex-end', // יישור הטקסט לצד ימין
  },
  predictionMainText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'right',
  },
  predictionSecondaryText: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    marginRight: 40,
    left: '100%',
    transform: [{ translateX: -85 }],
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    zIndex: 2,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    left: 10,
  },
  directionsText: {
    color: '#12405a',
    fontSize: 16,
    marginTop: 10,
    textDecorationLine: 'underline',
  },
  backButton: {
    position: 'absolute',
    top: 70,
    left: 20,
    backgroundColor: '#9bdd63',
    padding: 10,
    borderRadius: 50,
  },
  iconStyle: {
    width: 80,
    height: 80,
    marginLeft: -10,
  },
});
