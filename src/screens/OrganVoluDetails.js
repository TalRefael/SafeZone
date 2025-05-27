import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ImageBackground,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

const { width, height } = Dimensions.get('window');

const OrganVoluDetails = ({ route, navigation }) => {
  // חילוץ בטוח של נתונים
  const volunteering = route?.params?.volunteering || {};
  console.log("Extracted volunteering data:", volunteering);
  const translateY = useRef(new Animated.Value(-1000)).current;
  const contentAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const buttonAnimation = useRef(new Animated.Value(0)).current;
  
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    console.log("Starting animations");
    
    // נסה להשתמש באנימציה פשוטה יותר תחילה
    translateY.setValue(-1000);
    Animated.timing(translateY, {
      toValue: 0, // שנה לערך מוחלט שבטוח יציג את האלמנט
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      console.log("First animation complete");
      
      // הוסף בקרת שגיאות לאנימציות נוספות
      try {
        Animated.parallel([
          Animated.timing(contentAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          
          Animated.timing(fadeAnimation, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          
          Animated.spring(buttonAnimation, {
            toValue: 1,
            friction: 6,
            useNativeDriver: true,
          })
        ]).start(() => console.log("All animations complete"));
      } catch (error) {
        console.error("Animation error:", error);
      }
    });
  }, []);

  // Format location
  const formatLocation = (location) => {
    if (!location) return 'אין מידע זמין';
    
    if (typeof location === 'object' && location !== null) {
      if (location.city && location.address) {
        return `${location.city}, ${location.address}`;
      } else if (location.city) {
        return location.city;
      } else if (location.address) {
        return location.address;
      }
    }
    
    return String(location);
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'אין מידע זמין';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('he-IL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return String(dateString);
    }
  };
  
  // Format contact info
  const formatContact = (contact) => {
    if (!contact) return 'אין מידע זמין';
    
    if (typeof contact === 'object' && contact !== null) {
      let contactInfo = [];
      
      if (contact.name) contactInfo.push(`שם: ${contact.name}`);
      if (contact.phone) contactInfo.push(`טלפון: ${contact.phone}`);
      if (contact.email) contactInfo.push(`מייל: ${contact.email}`);
      
      return contactInfo.length > 0 ? contactInfo.join('\n') : 'אין מידע זמין';
    }
    
    return String(contact);
  };

  // Handle application submission
  const handleApply = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('אנא התחבר כדי להגיש מועמדות');
      return;
    }

    try {
      // Check if already applied
      const applicationsRef = collection(db, 'applications');
      const q = query(
        applicationsRef,
        where('userId', '==', user.uid),
        where('volunteeringId', '==', volunteering.id)
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        Alert.alert('הודעה', 'כבר הגשת מועמדות להתנדבות זו');
        return;
      }

      // Check available slots
      if (volunteering.availableSlots && parseInt(volunteering.availableSlots) <= 0) {
        Alert.alert('הודעה', 'אין מקומות פנויים להתנדבות זו');
        return;
      }

      // Add application to database
      await addDoc(applicationsRef, {
        userId: user.uid,
        volunteeringId: volunteering.id,
        title: volunteering.title,
        appliedAt: new Date(),
        status: 'pending',
        userEmail: user.email,
        userName: user.displayName || 'משתמש',
      });
      
      Alert.alert(
        'הצלחה',
        'מועמדותך התקבלה בהצלחה! נעדכן אותך בהמשך התהליך.',
        [
          { 
            text: 'אישור', 
            onPress: () => navigation.goBack() 
          }
        ]
      );
    } catch (error) {
      console.error('Error applying for volunteering:', error);
      Alert.alert('שגיאה', 'אירעה שגיאה בהגשת המועמדות, אנא נסה שוב מאוחר יותר');
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/all2.png')}
      style={styles.backgroundImage}
    >
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
        <View style={styles.headerButtons}>
  <TouchableOpacity
    style={styles.backButton}
    onPress={() => navigation.goBack()}
  >
    <Ionicons name="arrow-back" size={24} color="white" />
  </TouchableOpacity>
  
  <TouchableOpacity
    style={styles.statsButton}
    onPress={() => navigation.navigate('VolunteeringStats', { volunteering })}
  >
    <Ionicons name="stats-chart" size={24} color="white" />
    <Text style={styles.statsButtonText}>סטטיסטיקות</Text>
  </TouchableOpacity>
</View>
      

        <Animated.Text
          style={[
            styles.title,
            {
              opacity: fadeAnimation,
              transform: [
                {
                  translateY: fadeAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          {volunteering.title || 'התנדבות'}
        </Animated.Text>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
        >
          <Animated.View
            style={[
              styles.detailsCard,
              {
                opacity: contentAnimation,
                transform: [
                  {
                    translateY: contentAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [100, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {/* תיאור קצר */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>תיאור קצר</Text>
              <Text style={styles.sectionContent}>
                {volunteering.shortDescription || 'אין מידע זמין'}
              </Text>
            </View>

            {/* תיאור מפורט */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>תיאור מפורט</Text>
              <Text style={styles.description}>
                {volunteering.detailedDescription || 'אין מידע זמין'}
              </Text>
            </View>

            {/* סוג התנדבות */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>סוג ההתנדבות</Text>
              <Text style={styles.sectionContent}>
                {volunteering.volunteeringType || 'אין מידע זמין'}
              </Text>
            </View>

            {/* מיקום */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>מיקום</Text>
              <Text style={styles.sectionContent}>
                {formatLocation(volunteering.location)}
              </Text>
            </View>

            {/* תאריך ושעה */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>תאריך ושעה</Text>
              <Text style={styles.sectionContent}>
                {formatDate(volunteering.date)}
              </Text>
            </View>

            {/* משך ההתנדבות */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>משך ההתנדבות</Text>
              <Text style={styles.sectionContent}>
                {volunteering.duration || 'אין מידע זמין'}
              </Text>
            </View>

            {/* דרישות קדם */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>דרישות קדם</Text>
              <Text style={styles.description}>
                {volunteering.prerequisites || 'אין דרישות מיוחדות להתנדבות זו'}
              </Text>
            </View>

            {/* פרטי איש קשר */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>איש קשר</Text>
              <Text style={styles.description}>
                {formatContact(volunteering.contact)}
              </Text>
            </View>

            {/* מקומות פנויים */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>מקומות פנויים</Text>
              <Text style={styles.sectionContent}>
                {volunteering.availableSlots || 'אין מידע זמין'}
              </Text>
            </View>

        

            {/* מידע נוסף */}
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>מידע נוסף</Text>
              <Text style={styles.description}>
                {volunteering.additionalInfo || 'אין מידע נוסף'}
              </Text>
            </View>

     
          </Animated.View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 50,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
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
  backButton: {
    padding: 10,
    marginBottom: 20,
    zIndex: 10,
    alignSelf: 'flex-end', // מימין לשמאל
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  detailsCard: {
    backgroundColor: '#fff',
    borderRadius: 25,
    padding: 20,
    margin: 10,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  detailSection: {
    marginBottom: 20,
    alignItems: 'flex-end', // מימין לשמאל
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8c52ff',
    marginBottom: 5,
    textAlign: 'right',
  },
  sectionContent: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
    width: '100%',
  },
  description: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    textAlign: 'right',
    width: '100%',
  },
  applyButton: {
    borderRadius: 25,
    height: 50,
    overflow: 'hidden',
    marginTop: 20,
  },
  // הוספה לאובייקט הסטיילים
headerButtons: {
    flexDirection: 'row', // מימין לשמאל
    justifyContent: 'space-between',
    marginBottom: 20,
    width: '100%',
    zIndex: 10,
  },
  backButton: {
    padding: 10,
    zIndex: 10,
  },
  statsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    padding: 8,
    paddingHorizontal: 12,
    
  },
  statsButtonText: {
    color: 'white',
    marginRight: 5,
    fontWeight: 'bold',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 12,
  },
});

export default OrganVoluDetails;
