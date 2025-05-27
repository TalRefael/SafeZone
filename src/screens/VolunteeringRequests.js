import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ImageBackground,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  addDoc,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const VolunteeringRequests = ({ navigation, route }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [volunteeringTitle, setVolunteeringTitle] = useState('');
  const [volunteeringId, setVolunteeringId] = useState('');
  const translateY = React.useRef(new Animated.Value(-1000)).current;
  const titleAnimation = React.useRef(new Animated.Value(0)).current;
  const db = getFirestore();
  
  useEffect(() => {
    // Animation for the header circle and title
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
    
    if (route.params?.volunteeringId) {
      setVolunteeringId(route.params.volunteeringId);
    }
  }, []);

  // Fetch requests when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      const fetchRequests = async () => {
        if (!route.params?.volunteeringId) {
          Alert.alert('שגיאה', 'לא נמצא מזהה התנדבות');
          setLoading(false);
          return;
        }

        try {
          setLoading(true);
          const q = query(
            collection(db, 'applications'),
            where('volunteeringId', '==', route.params.volunteeringId)
          );
          
          const querySnapshot = await getDocs(q);
          const requestsList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // If we have requests, get the volunteering title from the first one
          if (requestsList.length > 0 && requestsList[0].title) {
            setVolunteeringTitle(requestsList[0].title);
          } else {
            // Try to get the title from the volunteering collection
            try {
              const volSnapshot = await getDocs(
                query(
                  collection(db, 'volunteerings'),
                  where('id', '==', route.params.volunteeringId)
                )
              );
              
              if (!volSnapshot.empty) {
                setVolunteeringTitle(volSnapshot.docs[0].data().title || 'בקשות התנדבות');
              }
            } catch (err) {
              console.error('Error fetching volunteering title:', err);
            }
          }
          
          setRequests(requestsList);
        } catch (error) {
          console.error('Error fetching volunteer requests:', error);
          Alert.alert('שגיאה', 'טעינת הבקשות נכשלה');
        } finally {
          setLoading(false);
        }
      };

      fetchRequests();
    }, [route.params?.volunteeringId])
  );

  // פונקציה לשליחת התראה למשתמש על שינוי סטטוס
  const sendStatusNotification = async (userId, status, volunteeringTitle) => {
    try {
      const notificationsRef = collection(db, 'notifications');
      const statusText = status === 'accepted' ? 'התקבלה' : 'נדחתה';
      
      // יצירת התראה חדשה במסד הנתונים
      await addDoc(notificationsRef, {
        receiverId: userId,
        title: 'עדכון סטטוס התנדבות',
        message: `בקשתך להתנדבות "${volunteeringTitle}" ${statusText}`,
        timestamp: serverTimestamp(),
        read: false,
        type: 'status_update',
        volunteeringId: volunteeringId,
        status: status
      });
      
      console.log(`Status notification sent to ${userId} for ${volunteeringTitle}`);
      
      // שליחת התראה גם לצ'אט (אופציונלי)
      await sendChatNotification(userId, status, volunteeringTitle);
      
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };
  
  // פונקציה לשליחת הודעת צ'אט אוטומטית (אופציונלי)
  const sendChatNotification = async (userId, status, volunteeringTitle) => {
    try {
      // בדיקה אם יש מנהל מוגדר להתנדבות זו
      const volunteeringsRef = collection(db, 'volunteerings');
      const q = query(volunteeringsRef, where('id', '==', volunteeringId));
      const volunteeringSnapshot = await getDocs(q);
      
      if (volunteeringSnapshot.empty) return;
      
      const volunteeringData = volunteeringSnapshot.docs[0].data();
      const organizerId = volunteeringData.organizerId;
      
      if (!organizerId) return;
      
      // יצירת מזהה צ'אט ייחודי (מזהי המשתמשים ממוינים אלפביתית)
      const chatId = [userId, organizerId].sort().join('_');
      
      // נוסח ההודעה לפי הסטטוס
      const message = status === 'accepted' 
        ? `שלום! בקשתך להתנדבות "${volunteeringTitle}" התקבלה. אנו מודים לך על הרצון להתנדב!`
        : `שלום, בקשתך להתנדבות "${volunteeringTitle}" נדחתה. אנא נסה התנדבויות אחרות שעשויות להתאים לך.`;
      
      // שליחת ההודעה לצ'אט
      const chatMessagesRef = collection(db, 'chatMessages');
      await addDoc(chatMessagesRef, {
        chatId: chatId,
        senderId: organizerId,
        receiverId: userId,
        text: message,
        timestamp: serverTimestamp(),
        read: false
      });
      
    } catch (error) {
      console.error('Error sending chat notification:', error);
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      // Find the matching request
      const request = requests.find(req => req.id === requestId);
      if (!request) return;
      
      // Update request status in database
      const requestRef = doc(db, 'applications', requestId);
      await updateDoc(requestRef, {
        status: 'accepted'
      });
      
      // Update available slots in the volunteering document
      const volunteeringRef = doc(db, 'volunteerings', volunteeringId);
      
      // Get current volunteering data
      const volunteeringDoc = await getDoc(volunteeringRef);
      if (volunteeringDoc.exists()) {
        const volunteeringData = volunteeringDoc.data();
        let availableSlots = volunteeringData.availableSlots;
        
        // Convert string to number, decrement, then convert back to string
        let slotsNumber = parseInt(availableSlots);
        
        // Check if it's a valid number
        if (!isNaN(slotsNumber) && slotsNumber > 0) {
          slotsNumber--;
          
          // Update the volunteering document with the new availableSlots value
          await updateDoc(volunteeringRef, {
            availableSlots: slotsNumber.toString()
          });
        }
      }
      
      // Send notification to user
      await sendStatusNotification(
        request.userId, 
        'accepted', 
        request.title || volunteeringTitle
      );
      
      // Update local state
      setRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === requestId ? { ...req, status: 'accepted' } : req
        )
      );
      
      Alert.alert('אושר בהצלחה', 'הבקשה אושרה בהצלחה והתראה נשלחה למשתמש');
    } catch (error) {
      console.error('Error accepting request:', error);
      Alert.alert('שגיאה', 'אישור הבקשה נכשל');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      // מציאת הבקשה המתאימה
      const request = requests.find(req => req.id === requestId);
      if (!request) return;
      
      // עדכון סטטוס הבקשה במסד הנתונים
      const requestRef = doc(db, 'applications', requestId);
      await updateDoc(requestRef, {
        status: 'rejected'
      });
      
      // שליחת התראה למשתמש
      await sendStatusNotification(
        request.userId, 
        'rejected', 
        request.title || volunteeringTitle
      );
      
      // עדכון מצב המקומי
      setRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === requestId ? { ...req, status: 'rejected' } : req
        )
      );
      
      Alert.alert('נדחה בהצלחה', 'הבקשה נדחתה בהצלחה והתראה נשלחה למשתמש');
    } catch (error) {
      console.error('Error rejecting request:', error);
      Alert.alert('שגיאה', 'דחיית הבקשה נכשלה');
    }
  };

  viewUserProfile = (userId, userName) => {
    // שינוי שם הפרמטר מ-userId ל-volunteerId כדי שיתאים למה שה-VolunteerDetailsScreen מצפה
    navigation.navigate('VolunteerDetailsScreen', { volunteerId: userId, userName });
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'תאריך לא זמין';
    
    try {
      // If timestamp is a Firestore timestamp
      if (timestamp.toDate) {
        return timestamp.toDate().toLocaleDateString('he-IL');
      }
      
      // If timestamp is seconds since epoch
      if (typeof timestamp === 'number') {
        return new Date(timestamp * 1000).toLocaleDateString('he-IL');
      }
      
      // If timestamp is a date string or object
      return new Date(timestamp).toLocaleDateString('he-IL');
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'תאריך לא תקין';
    }
  };

  const renderRequestItem = ({ item }) => {
    return (
      <Animated.View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <Text style={styles.userName}>{item.userName}</Text>
          <Text style={[
            styles.statusTag, 
            item.status === 'accepted' ? styles.acceptedStatus : 
            item.status === 'rejected' ? styles.rejectedStatus : 
            styles.pendingStatus
          ]}>
            {item.status === 'accepted' ? 'התקבל' :
            item.status === 'rejected' ? 'נדחה' : 
            'ממתין'}
          </Text>
        </View>
        
        <View style={styles.requestDetails}>
          <Text style={styles.userEmail}>{item.userEmail}</Text>
          <Text style={styles.appliedDate}>
            הוגש בתאריך: {formatDate(item.appliedAt)}
          </Text>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.viewProfileButton}
            onPress={() => viewUserProfile(item.userId, item.userName)}
          >
            <Text style={styles.buttonText}>צפייה בפרופיל</Text>
          </TouchableOpacity>
          
          {item.status === 'pending' && (
            <View style={styles.statusButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => handleAcceptRequest(item.id)}
              >
                <Ionicons name="checkmark-circle" size={18} color="white" />
                <Text style={styles.actionButtonText}>אישור</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleRejectRequest(item.id)}
              >
                <Ionicons name="close-circle" size={18} color="white" />
                <Text style={styles.actionButtonText}>דחייה</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Animated.View>
    );
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
          pointerEvents="none"
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
          בקשות להתנדבות
        </Animated.Text>

        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.volunteeringTitleContainer}>
          <Text style={styles.volunteeringTitle}>
            {volunteeringTitle || 'התנדבות'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8c52ff" />
            <Text style={styles.loadingText}>טוען בקשות...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="alert-circle-outline" size={60} color="#8c52ff" />
            <Text style={styles.emptyText}>אין בקשות להתנדבות זו</Text>
          </View>
        ) : (
          <FlatList
            data={requests}
            keyExtractor={(item) => item.id}
            renderItem={renderRequestItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
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
  backButton: {
    padding: 10,
    marginBottom: 20,
    zIndex: 5,
  },
  volunteeringTitleContainer: {
    marginTop: 80,
    alignItems: 'center',
    marginBottom: 20,
  },
  volunteeringTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 20,
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  requestCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 'bold',
  },
  pendingStatus: {
    backgroundColor: '#ffcc00',
    color: '#7a6100',
  },
  acceptedStatus: {
    backgroundColor: '#4caf50',
    color: 'white',
  },
  rejectedStatus: {
    backgroundColor: '#f44336',
    color: 'white',
  },
  requestDetails: {
    marginBottom: 15,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  appliedDate: {
    fontSize: 14,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'column',
  },
  viewProfileButton: {
    backgroundColor: '#8c52ff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: '#4caf50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5,
  },
});

export default VolunteeringRequests;
