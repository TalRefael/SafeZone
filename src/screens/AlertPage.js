import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ScrollView, 
  Modal, 
  TextInput 
} from 'react-native';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import Geocoder from 'react-native-geocoding';
import { Ionicons } from '@expo/vector-icons';

// Previous rocketAlertTimes array remains the same
const rocketAlertTimes = [
  // Northern Region (צפון) - Galilee and Golan Heights
  { name: 'מטולה', responseTime: 0, region: 'צפון', subRegion: 'גולן' },
  { name: 'קצרין', responseTime: 15, region: 'צפון', subRegion: 'גולן' },
  { name: 'קרית שמונה', responseTime: 15, region: 'צפון', subRegion: 'עליון גליל' },
  { name: 'נהריה', responseTime: 15, region: 'צפון', subRegion: 'גליל מערבי' },
  { name: 'עכו', responseTime: 15, region: 'צפון', subRegion: 'גליל מערבי' },
  { name: 'כרמיאל', responseTime: 30, region: 'צפון', subRegion: 'גליל תחתון' },
  { name: 'חיפה', responseTime: 30, region: 'צפון', subRegion: 'חוף' },
  { name: 'צפת', responseTime: 30, region: 'צפון', subRegion: 'גליל עליון' },
  { name: 'טבריה', responseTime: 45, region: 'צפון', subRegion: 'עמק הירדן' },
  { name: 'עפולה', responseTime: 45, region: 'צפון', subRegion: 'עמק יזרעאל' },
  { name: 'בית שאן', responseTime: 45, region: 'צפון', subRegion: 'עמק בית שאן' },
  { name: 'קריית מוצקין', responseTime: 30, region: 'צפון', subRegion: 'מפרץ חיפה' },
  { name: 'נצרת', responseTime: 45, region: 'צפון', subRegion: 'עמק יזרעאל' },
  { name: 'עין גב', responseTime: 45, region: 'צפון', subRegion: 'עמק הירדן' },
  { name: 'רמת מגשימים', responseTime: 15, region: 'צפון', subRegion: 'גולן' },

  // Southern Region (דרום) - Negev and Gaza Envelope
  { name: 'שדרות', responseTime: 15, region: 'דרום', subRegion: 'עוטף עזה' },
  { name: 'נתיבות', responseTime: 15, region: 'דרום', subRegion: 'עוטף עזה' },
  { name: 'אשקלון', responseTime: 30, region: 'דרום', subRegion: 'חוף אשקלון' },
  { name: 'אופקים', responseTime: 45, region: 'דרום', subRegion: 'באר טוביה' },
  { name: 'אשדוד', responseTime: 45, region: 'דרום', subRegion: 'חוף אשקלון' },
  { name: 'באר שבע', responseTime: 60, region: 'דרום', subRegion: 'נגב' },
  { name: 'דימונה', responseTime: 60, region: 'דרום', subRegion: 'נגב' },
  { name: 'ערד', responseTime: 60, region: 'דרום', subRegion: 'מדבר יהודה' },
  { name: 'אילת', responseTime: 90, region: 'דרום', subRegion: 'ערבה' },
  { name: 'סדרות', responseTime: 15, region: 'דרום', subRegion: 'עוטף עזה' },
  { name: 'מרחבים', responseTime: 30, region: 'דרום', subRegion: 'עוטף עזה' },
  { name: 'שובה', responseTime: 15, region: 'דרום', subRegion: 'עוטף עזה' },

  // Central Region (מרכז) - Coastal Plain and Sharon
  { name: 'נתניה', responseTime: 90, region: 'מרכז', subRegion: 'שרון' },
  { name: 'תל אביב', responseTime: 90, region: 'מרכז', subRegion: 'גוש דן' },
  { name: 'רמת גן', responseTime: 90, region: 'מרכז', subRegion: 'גוש דן' },
  { name: 'גבעתיים', responseTime: 90, region: 'מרכז', subRegion: 'גוש דן' },
  { name: 'חולון', responseTime: 90, region: 'מרכז', subRegion: 'גוש דן' },
  { name: 'ראשון לציון', responseTime: 90, region: 'מרכז', subRegion: 'שרון' },
  { name: 'הרצליה', responseTime: 90, region: 'מרכז', subRegion: 'שרון' },
  { name: 'רעננה', responseTime: 90, region: 'מרכז', subRegion: 'שרון' },
  { name: 'כפר סבא', responseTime: 90, region: 'מרכז', subRegion: 'שרון' },
  { name: 'פתח תקווה', responseTime: 90, region: 'מרכז', subRegion: 'גוש דן' },
  { name: 'רמלה', responseTime: 90, region: 'מרכז', subRegion: 'מרכז' },
  { name: 'לוד', responseTime: 90, region: 'מרכז', subRegion: 'מרכז' },
  { name: 'מודיעין', responseTime: 90, region: 'מרכז', subRegion: 'שפלה' },
  { name: 'חדרה', responseTime: 90, region: 'מרכז', subRegion: 'שרון' },
  { name: 'קיסריה', responseTime: 90, region: 'מרכז', subRegion: 'שרון' },
  { name: 'ראש העין', responseTime: 90, region: 'מרכז', subRegion: 'גוש דן' },
  { name: 'שומרון', responseTime: 90, region: 'מרכז', subRegion: 'שומרון' },
  { name: 'אריאל', responseTime: 90, region: 'מרכז', subRegion: 'שומרון' },

  // Jerusalem Region (ירושלים)
  { name: 'ירושלים', responseTime: 90, region: 'ירושלים', subRegion: 'מטרופולין ירושלים' },
  { name: 'בית שמש', responseTime: 90, region: 'ירושלים', subRegion: 'הרי יהודה' },
  { name: 'מעלה אדומים', responseTime: 90, region: 'ירושלים', subRegion: 'מדבר יהודה' },

  // Additional Settlements and Communities
  { name: 'קיבוץ יד מרדכי', responseTime: 15, region: 'דרום', subRegion: 'עוטף עזה' },
  { name: 'קיבוץ כפר עזה', responseTime: 15, region: 'דרום', subRegion: 'עוטף עזה' },
  { name: 'מושב גבים', responseTime: 15, region: 'דרום', subRegion: 'עוטף עזה' },
  { name: 'מושב יושיביה', responseTime: 30, region: 'דרום', subRegion: 'עוטף עזה' },
  { name: 'קיבוץ בארי', responseTime: 15, region: 'דרום', subRegion: 'עוטף עזה' },
];
const getAlertTime = (locationName) => {
  // Normalize location name by removing nikud and extra spaces
  const normalizedLocationName = locationName
    .replace(/[^\u0590-\u05FF\s]/g, '')  // Remove non-Hebrew characters
    .trim();

  // Find exact match or partial match
  const location = rocketAlertTimes.find(
    loc => loc.name === normalizedLocationName || 
           loc.name.includes(normalizedLocationName)
  );

  return location ? location : null;
};  

export default function ShelterAlertScreen() {
  const [location, setLocation] = useState(null);
  const [alertTime, setAlertTime] = useState(null);
  const [locationName, setLocationName] = useState('מיקום לא זוהה');
  const [customLocations, setCustomLocations] = useState([]);
  const [isAddLocationModalVisible, setAddLocationModalVisible] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [newLocationInput, setNewLocationInput] = useState('');

  Geocoder.init('AIzaSyB07kE_rkZtWdabbSVwRrfRYcHukMeYzx0');

  const getCurrentLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('הרשאת מיקום נדרשת');
      return;
    }
  
    let location = await Location.getCurrentPositionAsync({});
    setLocation(location.coords);
  
    try {
      const json = await Geocoder.from(location.coords.latitude, location.coords.longitude);
      
      const addressComponent = json.results[0];
      const cityComponent = 
        addressComponent.address_components.find(
          component => 
            component.types.includes('locality') || 
            component.types.includes('administrative_area_level_2') ||
            component.types.includes('postal_town')
        );
      
      const extractedLocationName = cityComponent 
        ? cityComponent.long_name 
        : (addressComponent.formatted_address || 'מיקום לא זוהה');
      
      setLocationName(extractedLocationName);
      const alertDetails = getAlertTime(extractedLocationName);
      setAlertTime(alertDetails);
      setSelectedLocation(alertDetails);
    } catch (error) {
      console.warn('Could not get location name', error);
      setLocationName('מיקום לא זוהה');
    }
  };

  const addCustomLocation = () => {
    if (newLocationInput) {
      const alertDetails = getAlertTime(newLocationInput);
      
      if (alertDetails) {
        const locationToAdd = {
          id: Date.now(),
          name: alertDetails.name,
          location: alertDetails
        };
        
        const updatedLocations = [
          ...customLocations, 
          locationToAdd
        ];
        
        setCustomLocations(updatedLocations);
        setAddLocationModalVisible(false);
        setNewLocationInput('');
      } else {
        Alert.alert('מיקום לא נמצא', 'אנא הזן שם עיר או יישוב קיים ברשימה');
      }
    } else {
      Alert.alert('אנא מלא את השדה');
    }
  };

  const deleteCustomLocation = (id) => {
    const updatedLocations = customLocations.filter(loc => loc.id !== id);
    setCustomLocations(updatedLocations);
  };

  const selectLocation = (location) => {
    setSelectedLocation(location);
    setLocationName(location.name);
    setAlertTime(location);
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  if (!location) {
    return (
      <View style={styles.container}>
        <Text>טוען מיקום...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>פיקוד העורף</Text>
        <TouchableOpacity 
          style={styles.addLocationButton}
          onPress={() => setAddLocationModalVisible(true)}
        >
          <Ionicons name="add-circle" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.alertInfoContainer}>
        <View style={styles.alertTimeBox}>
          <Text style={styles.alertTimeLabel}>זמן ההגעה למרחב מוגן</Text>
          <Text style={styles.alertTimeValue}>
            {selectedLocation ? `${selectedLocation.responseTime} שניות` : 'לא זוהה'}
          </Text>
        </View>
        <View style={styles.locationBox}>
          <Text style={styles.locationLabel}>אזור התרעה</Text>
          <Text style={styles.locationValue}>{locationName}</Text>
        </View>
      </View>

      <MapView
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
      >
        <Marker
          coordinate={{
            latitude: location.latitude,
            longitude: location.longitude
          }}
          title="המיקום שלך"
          pinColor="blue"
        />
      </MapView>

      <View style={styles.customLocationsContainer}>
        <Text style={styles.customLocationsTitle}>מיקומים מותאמים אישית</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
        >
          {customLocations.map((loc) => (
            <TouchableOpacity 
              key={loc.id} 
              style={styles.customLocationCard}
              onPress={() => selectLocation(loc.location)}
            >
              <Text style={styles.customLocationName}>{loc.name}</Text>
              <Text style={styles.customLocationTime}>{loc.location.responseTime} שניות</Text>
              <TouchableOpacity 
                onPress={() => deleteCustomLocation(loc.id)}
                style={styles.deleteLocationButton}
              >
                <Ionicons name="trash" size={16} color="white" />
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={getCurrentLocation}
      >
        <Text style={styles.refreshButtonText}>רענן מיקום</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isAddLocationModalVisible}
        onRequestClose={() => setAddLocationModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>הוסף מיקום חדש</Text>
            <TextInput
              style={styles.input}
              placeholder="שם העיר או היישוב"
              value={newLocationInput}
              onChangeText={setNewLocationInput}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={styles.modalConfirmButton}
                onPress={addCustomLocation}
              >
                <Text style={styles.modalButtonText}>הוסף</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.modalCancelButton}
                onPress={() => setAddLocationModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>בטל</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFA500',
  },
  headerContainer: {
    flexDirection: 'row',
    backgroundColor: '#12405a',
    padding: 55,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addLocationButton: {
    padding: 5,
  },
  alertInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'white',
  },
  alertTimeBox: {
    alignItems: 'center',
    flex: 1,
  },
  locationBox: {
    alignItems: 'center',
    flex: 1,
  },
  alertTimeLabel: {
    fontSize: 14,
    color: '#666',
  },
  alertTimeValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'red',
  },
  locationLabel: {
    fontSize: 14,
    color: '#666',
  },
  locationValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  map: {
    flex: 1,
  },
  refreshButton: {
    backgroundColor: '#12405a',
    padding: 15,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  customLocationsContainer: {
    backgroundColor: 'white',
    padding: 10,
  },
  customLocationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'right',
  },
  customLocationCard: {
    backgroundColor: '#12405a',
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
    alignItems: 'center',
    position: 'relative',
  },
  customLocationName: {
    color: 'white',
    fontWeight: 'bold',
  },
  customLocationTime: {
    color: 'lightblue',
  },
  deleteLocationButton: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  input: {
    width: '100%',
    borderBottomWidth: 1,
    borderColor: '#12405a',
    marginBottom: 15,
    paddingBottom: 5,
    textAlign: 'right',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalConfirmButton: {
    backgroundColor: '#12405a',
    padding: 10,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: 'red',
    padding: 10,
    borderRadius: 10,
    flex: 1,
    alignItems: 'center',
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});