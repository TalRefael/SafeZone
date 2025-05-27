import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  ImageBackground,
  Alert,
  Modal,
  FlatList,
  TouchableWithoutFeedback,
  Dimensions,
  Animated,
} from 'react-native';
import { doc, getDoc, updateDoc, collection, getDocs, arrayUnion, query, where } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

// קבלת מידות המסך
const { width, height } = Dimensions.get('window');

// Star Rating Component
const StarRating = ({ rating, onRatingChange = null }) => {
  return (
    <View style={styles.starContainer}>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity 
            key={star} 
            onPress={() => onRatingChange && onRatingChange(star)}
            disabled={!onRatingChange}
          >
            <Ionicons
              name={star <= rating ? "star" : "star-outline"}
              size={24}
              color={star <= rating ? "#FFD700" : "#BDC3C7"}
              style={styles.starIcon}
            />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.ratingText}>דירוג המתנדב: </Text>
    </View>
  );
};
const openTaskAssignmentModal = async () => {
  try {
    const userUid = await AsyncStorage.getItem('userId');
    
    if (!userUid) {
      Alert.alert('שגיאה', 'משתמש לא מחובר למערכת');
      return;
    }
    
    const userDocRef = doc(db, 'users', userUid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists() || !userDoc.data().isOrganization) {
      Alert.alert('שגיאה', 'רק ארגונים רשאים לשבץ משימות');
      return;
    }
    
    setSelectedTasks([]);
    setModalVisible(true);
    fetchAvailableTasks();
  } catch (error) {
    console.error('Error checking organization permissions:', error);
    Alert.alert('שגיאה', 'שגיאה באימות הרשאות: ' + error.message);
  }
};
// Task Item Component for the modal
const TaskItem = ({ task, selected, onToggle }) => {
  return (
    <TouchableOpacity 
      style={[styles.taskItem, selected && styles.taskItemSelected]} 
      onPress={onToggle}
    >
      <View style={styles.taskCheckbox}>
        {selected && <Ionicons name="checkmark" size={20} color="#2c6975" />}
      </View>
      <View style={styles.taskDetails}>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskDescription} numberOfLines={2}>{task.description}</Text>
        <Text style={styles.taskDate}>{task.date}</Text>
      </View>
    </TouchableOpacity>
  );
};

const VolunteerDetailsScreen = ({ route, navigation }) => {
  // קבל מזהה המתנדב (בדוק אם יש volunteerId או userId בפרמטרים)
  const { volunteerId, userId } = route.params;
  const volunteerIdToUse = volunteerId || userId;
  
  const [volunteer, setVolunteer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const [hasRated, setHasRated] = useState(false);
  const [fullName, setFullName] = useState(''); // משתנה חדש לשם המלא
  
  // משתנים חדשים לפופ-אפ של שיבוץ משימות
  const [modalVisible, setModalVisible] = useState(false);
  const [availableTasks, setAvailableTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  
  const db = getFirestore();
  
  // לוג לצורך דיבוג
  console.log("Route params:", route.params);
  console.log("Using volunteer ID:", volunteerIdToUse);

  // אנימציה למעגל של הרקע
  const translateY = useRef(new Animated.Value(-1000)).current;
  const titleAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // הפעלת אנימציה של הרקע
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
  }, []);

  // בדיקה אם המשתמש כבר דירג את המתנדב הזה
  const checkPreviousRating = async () => {
    try {
      const ratingKey = `volunteer_rating_${volunteerIdToUse}`;
      const storedRating = await AsyncStorage.getItem(ratingKey);
      
      if (storedRating !== null) {
        setUserRating(parseInt(storedRating));
        setHasRated(true);
      }
    } catch (error) {
      console.error('Error checking previous rating:', error);
    }
  };

  useEffect(() => {
    const fetchVolunteerDetails = async () => {
      if (!volunteerIdToUse) {
        console.error('No volunteer ID provided');
        Alert.alert('שגיאה', 'מזהה המתנדב חסר');
        setLoading(false);
        navigation.goBack();
        return;
      }

      try {
        setLoading(true);
        const volunteerDocRef = doc(db, 'volunteerProfiles', volunteerIdToUse);
        console.log("Fetching volunteer document:", volunteerDocRef);
        
        const volunteerDoc = await getDoc(volunteerDocRef);
        
        if (volunteerDoc.exists()) {
          const volunteerData = volunteerDoc.data();
          console.log("Volunteer data retrieved:", volunteerData);
          setVolunteer(volunteerData);
          setRating(volunteerData.rating || 0);
          
          // השגת השם המלא מקולקשן users
          if (volunteerData.userId) {
            const userDocRef = doc(db, 'users', volunteerData.userId);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const userData = userDoc.data();
              // הנחה שיש שדות firstName ו-lastName, התאם לפי המבנה האמיתי שלך
              const name = userData.fullName || 
                          (userData.firstName && userData.lastName ? 
                           `${userData.firstName} ${userData.lastName}` : 
                           userData.firstName || userData.lastName || 'מתנדב/ת');
              setFullName(name);
            }
          } else if (route.params.userName) {
            // אם אין userId אבל יש userName בפרמטרים, השתמש בו
            setFullName(route.params.userName);
          }
          
          // בדיקה אם המשתמש כבר דירג את המתנדב
          await checkPreviousRating();
        } else {
          console.error('Volunteer document not found');
          alert('לא נמצא מידע על המתנדב');
          navigation.goBack();
        }
      } catch (error) {
        console.error('Error fetching volunteer details:', error);
        alert('שגיאה בטעינת פרטי המתנדב: ' + error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVolunteerDetails();
  }, [volunteerIdToUse, db, navigation]);

  // פונקציה חדשה לטעינת משימות זמינות
  // פונקציה מתוקנת לטעינת משימות זמינות
  const fetchAvailableTasks = async () => {
    try {
      setLoadingTasks(true);
      
      // קבל את המזהה של המשתמש הנוכחי (הארגון)
      const userUid = await AsyncStorage.getItem('userId');
      
      if (!userUid) {
        console.error('No user ID found in AsyncStorage');
        
        // במקום להציג הודעת שגיאה, ננסה לקבל את פרטי המשתמש ישירות מ-Firebase
        const auth = getAuth();
        const currentUser = auth.currentUser;
        
        if (!currentUser) {
          Alert.alert('שגיאה', 'משתמש לא מחובר למערכת');
          setLoadingTasks(false);
          return;
        }
        
        // משתמשים במזהה המשתמש המחובר
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists() || !userDoc.data().isOrganization) {
          Alert.alert('שגיאה', 'רק ארגונים רשאים לשבץ משימות');
          setLoadingTasks(false);
          return;
        }
        
        // קבל את המשימות של הארגון
        const tasksCollectionRef = collection(db, 'volunteerings');
        const tasksQuery = query(tasksCollectionRef, where("userId", "==", currentUser.uid));
        const tasksSnapshot = await getDocs(tasksQuery);
        
        // בדוק אילו משימות המתנדב כבר הגיש עליהן בקשה
        const applicationsCollectionRef = collection(db, 'applications');
        const applicationsQuery = query(applicationsCollectionRef, where("userId", "==", volunteerIdToUse));
        const applicationsSnapshot = await getDocs(applicationsQuery);
        
        // צור מערך של מזהי המשימות שהמתנדב כבר הגיש עליהן בקשה
        const appliedTaskIds = [];
        applicationsSnapshot.forEach(doc => {
          const applicationData = doc.data();
          if (applicationData.volunteeringId) {
            appliedTaskIds.push(applicationData.volunteeringId);
          }
        });
        
        console.log("Tasks already applied for:", appliedTaskIds);
        
        const tasks = [];
        tasksSnapshot.forEach(doc => {
          const taskData = doc.data();
          const taskId = doc.id;
          
          // בדוק שהמשימה עדיין רלוונטית לשיבוץ וגם שהמתנדב לא הגיש עליה בקשה
          // וגם שהמשימה לא הוצעה כבר למתנדב
          if (taskData.status !== 'completed' && 
              taskData.status !== 'assigned' && 
              !appliedTaskIds.includes(taskId) &&
              // התנאי החדש: בדיקה שהמתנדב לא נמצא במערך offeredTo
              (!taskData.offeredTo || !taskData.offeredTo.includes(volunteerIdToUse))) {
            tasks.push({
              id: taskId,
              ...taskData
            });
          }
        });
        
        console.log("Available tasks after filtering:", tasks);
        setAvailableTasks(tasks);
        return;
      }
      
      // אם יש userUid, נבדוק אם המשתמש הוא ארגון
      const userDocRef = doc(db, 'users', userUid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        Alert.alert('שגיאה', 'משתמש לא נמצא');
        setLoadingTasks(false);
        return;
      }
      
      const userData = userDoc.data();
      
      if (!userData.isOrganization) {
        Alert.alert('שגיאה', 'רק ארגונים רשאים לשבץ משימות');
        setLoadingTasks(false);
        return;
      }
      
      // קבל את המשימות של הארגון
      const tasksCollectionRef = collection(db, 'volunteerings');
      const tasksQuery = query(tasksCollectionRef, where("userId", "==", userUid));
      const tasksSnapshot = await getDocs(tasksQuery);
      
      // בדוק אילו משימות המתנדב כבר הגיש עליהן בקשה
      const applicationsCollectionRef = collection(db, 'applications');
      const applicationsQuery = query(applicationsCollectionRef, where("userId", "==", volunteerIdToUse));
      const applicationsSnapshot = await getDocs(applicationsQuery);
      
      // צור מערך של מזהי המשימות שהמתנדב כבר הגיש עליהן בקשה
      const appliedTaskIds = [];
      applicationsSnapshot.forEach(doc => {
        const applicationData = doc.data();
        if (applicationData.volunteeringId) {
          appliedTaskIds.push(applicationData.volunteeringId);
        }
      });
      
      console.log("Tasks already applied for:", appliedTaskIds);
      
      const tasks = [];
      tasksSnapshot.forEach(doc => {
        const taskData = doc.data();
        const taskId = doc.id;
        
        // בדוק שהמשימה עדיין רלוונטית לשיבוץ וגם שהמתנדב לא הגיש עליה בקשה
        if (taskData.status !== 'completed' && 
            taskData.status !== 'assigned' && 
            !appliedTaskIds.includes(taskId)) {
          tasks.push({
            id: taskId,
            ...taskData
          });
        }
      });
      
      console.log("Available tasks after filtering:", tasks);
      setAvailableTasks(tasks);
    } catch (error) {
      console.error('Error fetching available tasks:', error);
      Alert.alert('שגיאה', 'שגיאה בטעינת משימות זמינות: ' + error.message);
    } finally {
      setLoadingTasks(false);
    }
  };

  // פונקציה לבחירת משימה
  const toggleTaskSelection = (taskId) => {
    setSelectedTasks(prevSelected => {
      if (prevSelected.includes(taskId)) {
        return prevSelected.filter(id => id !== taskId);
      } else {
        return [...prevSelected, taskId];
      }
    });
  };

  // פתיחת המודל והבאת המשימות הזמינות
  const openTaskAssignmentModal = () => {
    setSelectedTasks([]);
    setModalVisible(true);
    fetchAvailableTasks();
  };

  // שליחת המשימות הנבחרות למתנדב
  const assignTasksToVolunteer = async () => {
    if (selectedTasks.length === 0) {
      Alert.alert('שגיאה', 'נא לבחור לפחות משימה אחת');
      return;
    }
    
    try {
      // עדכון מסמך המתנדב עם המשימות החדשות
      const volunteerDocRef = doc(db, 'volunteerProfiles', volunteerIdToUse);
      
      // קבלת הפרטים של כל משימה נבחרת
      const selectedTasksDetails = availableTasks.filter(task => 
        selectedTasks.includes(task.id)
      );
      
      // הוספת צמצם המשימות לרשימת המשימות המוצעות למתנדב
      await updateDoc(volunteerDocRef, {
        offeredTasks: arrayUnion(...selectedTasksDetails)
      });
      
      // עדכון הסטטוס של המשימות שנבחרו כ"מוצעות"
      for (const taskId of selectedTasks) {
        const taskDocRef = doc(db, 'volunteerings', taskId);
        await updateDoc(taskDocRef, {
          status: 'offered',
          offeredTo: arrayUnion(volunteerIdToUse)
        });
      }
      
      Alert.alert(
        "המשימות הוצעו בהצלחה",
        `${selectedTasks.length} משימות הוצעו למתנדב ${fullName}`,
        [{ 
          text: "אישור", 
          onPress: () => setModalVisible(false)
        }]
      );
    } catch (error) {
      console.error('Error assigning tasks:', error);
      Alert.alert('שגיאה', 'שגיאה בשיבוץ המשימות: ' + error.message);
    }
  };

  const handleRatingChange = async (newRating) => {
    try {
      // שמירת הדירוג במכשיר המשתמש
      const ratingKey = `volunteer_rating_${volunteerIdToUse}`;
      await AsyncStorage.setItem(ratingKey, newRating.toString());
      
      // עדכון הדירוג בשרת
      const volunteerDocRef = doc(db, 'volunteerProfiles', volunteerIdToUse);
      const volunteerDoc = await getDoc(volunteerDocRef);
      
      if (volunteerDoc.exists()) {
        const volunteerData = volunteerDoc.data();
        
        // קבלת הדירוגים הקיימים או אתחול אם אין
        const existingRatings = volunteerData.ratings || [];
        const totalRatings = existingRatings.length;
        
        // חישוב דירוג ממוצע חדש
        let newAvgRating;
        if (totalRatings === 0) {
          newAvgRating = newRating;
        } else {
          // חישוב סכום כל הדירוגים + הדירוג החדש
          const ratingSum = existingRatings.reduce((sum, r) => sum + r, 0) + newRating;
          newAvgRating = parseFloat((ratingSum / (totalRatings + 1)).toFixed(1));
        }
        
        // עדכון מסמך המתנדב עם הדירוג החדש
        await updateDoc(volunteerDocRef, {
          ratings: [...existingRatings, newRating],
          rating: newAvgRating,
        });
        
        // עדכון המצב המקומי - חשוב: קודם מעדכנים את הדירוג ורק אז את סטטוס ההצבעה
        setRating(newAvgRating);
        setUserRating(newRating);
        setHasRated(true); // עדכון הסטייט שמציין שהמשתמש דירג
        
        Alert.alert(
          "דירוג נשמר",
          "תודה על הדירוג! הדירוג הממוצע עודכן.",
          [{ text: "אישור", style: "default" }]
        );
      }
    } catch (error) {
      console.error('Error updating rating:', error);
      Alert.alert(
        "שגיאה",
        "לא ניתן לשמור את הדירוג. אנא נסה שוב מאוחר יותר.",
        [{ text: "הבנתי", style: "default" }]
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2c6975" />
      </View>
    );
  }

  // תמונת פרופיל ברירת מחדל אם אין
  const profileImage = volunteer?.profilePicture 
    ? { uri: volunteer.profilePicture } 
    : require('../../assets/men.png');

  return (
    <View style={styles.container}>
      {/* רקע גרדיאנט חדש */}
      <Animated.View
        style={[
          styles.halfCircle,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        <LinearGradient
          colors={['#cdffd8', '#94b9ff', '#cdffd8']}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
      </Animated.View>

      {/* כותרת עם אנימציה */}
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
      </Animated.Text>

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {/* פרופיל וכותרת */}
        <View style={styles.profileSection}>
          <Image source={profileImage} style={styles.profileImage} />
          <View style={styles.basicInfo}>
            <Text style={styles.volunteerName}>
              {fullName || volunteer?.userId || 'מתנדב/ת'}
            </Text>
           
            {/* אם המשתמש כבר דירג, הצג את הדירוג שלו */}
            {hasRated ? (
              <View style={styles.userRatingContainer}>
                <Text style={styles.userRatingText}>הדירוג שלך: </Text>
                <StarRating rating={userRating} />
              </View>
            ) : (
              /* אחרת, הצג אפשרות לדרג */
              <View style={styles.ratingSection}>
                <Text style={styles.rateInstructionText}>דרג את המתנדב:</Text>
                <StarRating rating={userRating} onRatingChange={handleRatingChange} />
              </View>
            )}
          </View>
        </View>
    
        {/* מידע מפורט */}
        <View style={styles.detailsContainer}>
          {/* מיומנויות */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>מיומנויות וכישורים</Text>
            <Text style={styles.sectionContent}>{volunteer?.skills || 'לא צוין'}</Text>
          </View>
          
          {/* ניסיון */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>ניסיון קודם בהתנדבות</Text>
            <Text style={styles.sectionContent}>{volunteer?.experience || 'לא צוין'}</Text>
          </View>
          
          {/* זמינות */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>זמינות</Text>
            {volunteer?.selectedAvailability && volunteer.selectedAvailability.length > 0 ? (
              <View style={styles.availabilityContainer}>
                {volunteer.selectedAvailability.map((day, index) => (
                  <View key={index} style={styles.dayTag}>
                    <Text style={styles.dayTagText}>{day}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.sectionContent}>לא צוין</Text>
            )}
          </View>
          
          {/* רכב */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>רכב</Text>
            <Text style={styles.sectionContent}>
              {volunteer?.hasCar ? 'יש רכב' : 'אין רכב'}
            </Text>
          </View>
          
          {/* ניידות */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>אפשרויות ניידות</Text>
            <Text style={styles.sectionContent}>
              {volunteer?.mobilityOptions || 'לא צוין'}
            </Text>
          </View>
          
          {/* שפות */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>שפות</Text>
            <Text style={styles.sectionContent}>{volunteer?.languages || 'לא צוין'}</Text>
          </View>
          
          {/* מוטיבציה */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>סיבת ההתנדבות</Text>
            <Text style={styles.sectionContent}>{volunteer?.motivation || 'לא צוין'}</Text>
          </View>
          
          {/* מידע נוסף */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>מידע נוסף</Text>
            <Text style={styles.sectionContent}>{volunteer?.additionalInfo || 'לא צוין'}</Text>
          </View>
          
          {/* פרטי קשר */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionTitle}>פרטי התקשרות</Text>
            <View style={styles.contactInfoContainer}>
              {volunteer?.phoneNumber && (
                <TouchableOpacity style={styles.contactButton}>
                  <Ionicons name="call" size={24} color="#2c6975" />
                  <Text style={styles.contactButtonText}>{volunteer.phoneNumber}</Text>
                </TouchableOpacity>
              )}
              
              {volunteer?.email && (
                <TouchableOpacity style={styles.contactButton}>
                  <Ionicons name="mail" size={24} color="#2c6975" />
                  <Text style={styles.contactButtonText}>{volunteer.email}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        
        {/* כפתורים לפעולות נוספות */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => navigation.navigate('ChatScreen', { 
              volunteerId: volunteerIdToUse,
              volunteerName: fullName || volunteer?.userId || 'מתנדב/ת'
            })}
          >
            <Ionicons name="chatbubble" size={20} color="white" />
            <Text style={styles.actionButtonText}>צ'אט עם המתנדב</Text>
          </TouchableOpacity>
            
          <TouchableOpacity 
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={openTaskAssignmentModal}
          >
            <Ionicons name="calendar" size={20} color="#2c6975" />
            <Text style={styles.secondaryButtonText}>שיבוץ למשימה</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* מודל פופ-אפ לשיבוץ משימות */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <TouchableOpacity 
                    style={styles.modalCloseButton} 
                    onPress={() => setModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#2c6975" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>שיבוץ משימות למתנדב</Text>
                </View>
                
                <Text style={styles.modalSubtitle}>
                  בחר משימות להציע ל{fullName || "מתנדב"}:
                </Text>
                
                {loadingTasks ? (
  <ActivityIndicator size="large" color="#2c6975" style={styles.modalLoading} />
) : availableTasks.length === 0 ? (
  <Text style={styles.noTasksText}>
    לא נמצאו משימות זמינות להצעה. ייתכן שהמתנדב כבר הגיש בקשה למשימות הקיימות או שהמשימות כבר הוצעו למתנדב זה.
  </Text>
) : (
  <FlatList
    data={availableTasks}
    keyExtractor={(item) => item.id}
    renderItem={({ item }) => (
      <TaskItem 
        task={item} 
        selected={selectedTasks.includes(item.id)}
        onToggle={() => toggleTaskSelection(item.id)}
      />
    )}
    style={styles.tasksList}
  />
)}
                
                <View style={styles.modalFooter}>
                  <TouchableOpacity 
                    style={[
                      styles.modalButton, 
                      styles.assignButton,
                      selectedTasks.length === 0 && styles.disabledButton
                    ]}
                    onPress={assignTasksToVolunteer}
                    disabled={selectedTasks.length === 0}
                  >
                    <Text style={styles.assignButtonText}>
                      הצע {selectedTasks.length > 0 ? `(${selectedTasks.length})` : ''}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.cancelButtonText}>ביטול</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 0,
  },
  // סגנונות חדשים לרקע גרדיאנט
  halfCircle: {
    position: 'absolute',
    top: 0,
    left: width / 2 - 500,
    width: 1000,
    height: 1000,
    borderRadius: 500,
    overflow: 'hidden',
    zIndex: -1,
  },
  gradient: {
    flex: 1,
  },
  circleTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    position: 'absolute',
    top: 80,
    width: '100%',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 20,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 18,
    top:1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  contentContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 16,
    marginBottom: 20,
    marginHorizontal: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    marginBottom: 15,
  },
  basicInfo: {
    alignItems: 'center',
  },
  volunteerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#94b9ff',
    marginBottom: 5,
    textAlign: 'center',
  },
  joinDate: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  starContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  ratingText: {
    fontSize: 16,
    color: '#34495e',
    marginLeft: 5,
  },
  starsRow: {
    flexDirection: 'row',
  },
  starIcon: {
    marginHorizontal: 2,
  },
  ratingSection: {
    marginTop: 15,
    alignItems: 'center',
  },
  rateInstructionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c6975',
    marginBottom: 5,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#94b9ff',
    marginBottom: 8,
    textAlign: 'right',
  },
  sectionContent: {
    fontSize: 16,
    color: '#34495e',
    lineHeight: 22,
    textAlign: 'right',
  },
  availabilityContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayTag: {
    backgroundColor: '#94b9ff',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
    marginBottom: 8,
  },
  dayTagText: {
    color: 'white',
    fontSize: 14,
  },
  contactInfoContainer: {
    marginTop: 10,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  contactButtonText: {
    color: '#34495e',
    marginRight: 10,
    fontSize: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    marginHorizontal: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#94b9ff',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#94b9ff',
  },
  secondaryButtonText: {
    color: '#94b9ff',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  
  // סגנונות עבור המודל פופ-אפ
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    position: 'relative',
  },
  modalCloseButton: {
    position: 'absolute',
    left: 0,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#94b9ff',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 15,
    textAlign: 'right',
  },
  modalLoading: {
    marginVertical: 30,
  },
  tasksList: {
    maxHeight: 300,
  },
  taskItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  taskItemSelected: {
    backgroundColor: 'rgba(148, 185, 255, 0.1)',
    borderColor: '#94b9ff',
  },
  taskCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#94b9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 15,
  },
  taskDetails: {
    flex: 1,
    alignItems: 'flex-end',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#94b9ff',
    marginBottom: 5,
    textAlign: 'right',
  },
  taskDescription: {
    fontSize: 14,
    color: '#34495e',
    marginBottom: 5,
    textAlign: 'right',
  },
  taskDate: {
    fontSize: 12,
    color: '#7f8c8d',
    textAlign: 'right',
  },
  noTasksText: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginVertical: 30,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  assignButton: {
    backgroundColor: '#94b9ff',
    marginLeft: 0,
  },
  assignButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 0,
  },
  cancelButtonText: {
    color: '#7f8c8d',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#95a5a6',
    opacity: 0.7,
  },
  
  // סגנונות נוספים שחסרים
  userRatingContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: 10,
  },
  userRatingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#94b9ff',
    marginBottom: 5,
  },
  chatButton: {
    backgroundColor: '#27ae60',
  },
  chatButtonText: {
    color: 'white',
  },
  volunteerRating: {
    fontSize: 16,
    color: '#34495e',
    marginBottom: 10,
  },
  ratingNumber: {
    fontWeight: 'bold',
    color: '#94b9ff',
  },
  badge: {
    backgroundColor: '#94b9ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginVertical: 5,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  horizontalList: {
    flexDirection: 'row',
    paddingHorizontal: 5,
  },
  volunteerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f8f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginBottom: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#27ae60',
    marginLeft: 6,
  },
  statusText: {
    color: '#27ae60',
    fontSize: 14,
    fontWeight: 'bold',
  },
  inactiveStatus: {
    backgroundColor: '#fef9e7',
  },
  inactiveStatusDot: {
    backgroundColor: '#f39c12',
  },
  inactiveStatusText: {
    color: '#f39c12',
  },
  headerIconContainer: {
    position: 'absolute',
    right: 0,
    flexDirection: 'row',
  },
  headerIcon: {
    marginHorizontal: 8,
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    borderRadius: 25,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 20,
    alignSelf: 'center',
  },
  historyButtonText: {
    color: '#34495e',
    marginRight: 10,
    fontSize: 14,
    fontWeight: 'bold',
  },
  statisticsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f5f7fa',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  statisticItem: {
    alignItems: 'center',
  },
  statisticNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#94b9ff',
    marginBottom: 5,
  },
  statisticLabel: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 20,
  },
  tagContainer: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    marginBottom: 10,
  },
  tag: {
    backgroundColor: '#ebf5f7',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginLeft: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#94b9ff',
  },
  tagText: {
    color: '#94b9ff',
    fontSize: 14,
  },
  certificationsContainer: {
    marginTop: 10,
  },
  certificationItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginBottom: 10,
  },
  certificationIcon: {
    marginLeft: 10,
  },
  certificationText: {
    fontSize: 14,
    color: '#34495e',
  },
  recommendationContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginTop: 5,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#94b9ff',
  },
  recommendationText: {
    fontSize: 14,
    color: '#34495e',
    fontStyle: 'italic',
    lineHeight: 20,
    textAlign: 'right',
  },
  recommendationAuthor: {
    fontSize: 12,
    color: '#7f8c8d',
    marginTop: 8,
    textAlign: 'left',
  }
});

export default VolunteerDetailsScreen;
