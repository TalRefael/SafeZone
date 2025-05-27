import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getFirestore, collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';
import { PieChart, LineChart, BarChart } from 'react-native-chart-kit';

const { width, height } = Dimensions.get('window');
const VolunteeringStats = ({ route, navigation }) => {
  const { volunteering } = route.params;
  const [stats, setStats] = useState({
    totalApplicants: 0,
    acceptedApplicants: 0,
    pendingApplicants: 0,
    rejectedApplicants: 0,
    availableSlots: parseInt(volunteering.availableSlots || 0),
    daysUntilEvent: 0,
    responsesPerDay: [],
    applicationsOverTime: [],
    applicantGenders: { male: 0, female: 0, other: 0 },
    conversionRate: 0
  });
  const [loading, setLoading] = useState(true);
  
  // Animation references
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-1000)).current;
  const cardsAnimation = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Start animations
    Animated.timing(translateY, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      Animated.parallel([
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(cardsAnimation, {
          toValue: 1,
          friction: 6,
          useNativeDriver: true,
        })
      ]).start();
    });
    
    // Fetch statistics data
    fetchStatistics();
  }, []);
  
  const fetchStatistics = async () => {
    try {
      const db = getFirestore();
      
      // Get all applications for this volunteering
      const applicationsRef = collection(db, 'applications');
      const q = query(
        applicationsRef,
        where('volunteeringId', '==', volunteering.id)
      );
      
      const querySnapshot = await getDocs(q);
      const applications = [];
      let accepted = 0;
      let pending = 0;
      let rejected = 0;
      
      // Object to store gender counts
      const genders = { male: 0, female: 0, other: 0 };
      
      // Arrays to track applications over time
      const applicationDates = [];
      const appsByStatus = { accepted: [], pending: [], rejected: [] };
      
      // Process each application
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        applications.push({id: doc.id, ...data});
        
        // Count by status
        if (data.status === 'accepted') {
          accepted++;
          appsByStatus.accepted.push(data);
        }
        else if (data.status === 'pending') {
          pending++;
          appsByStatus.pending.push(data);
        }
        else if (data.status === 'rejected') {
          rejected++;
          appsByStatus.rejected.push(data);
        }
        
        // Track application date
        if (data.appliedAt) {
          const date = new Date(data.appliedAt.seconds * 1000);
          const dateStr = date.toLocaleDateString('he-IL');
          applicationDates.push({date: dateStr, status: data.status});
        }
      });
      
      // Fetch user gender data for all applications
      const usersToFetch = applications.map(app => app.userId).filter(Boolean);
      
      // Only proceed if we have user IDs to fetch
      if (usersToFetch.length > 0) {
        for (const userId of usersToFetch) {
          try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              const gender = userData.gender?.toLowerCase() || 'other';
              
              if (gender === 'male' || gender === 'זכר') {
                genders.male++;
              } else if (gender === 'female' || gender === 'נקבה') {
                genders.female++;
              } else {
                genders.other++;
              }
            }
          } catch (err) {
            console.error('Error fetching user data:', err);
          }
        }
      }
      
      // Calculate days until event
      let daysUntil = 0;
      if (volunteering.date) {
        const eventDate = new Date(volunteering.date);
        const today = new Date();
        daysUntil = Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
      }
      
      // Group applications by date for timeline
      const responsesByDay = {};
      const lastSevenDays = [];
      
      // Create array of the last 7 days
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('he-IL');
        responsesByDay[dateStr] = 0;
        lastSevenDays.push(dateStr);
      }
      
      // Fill in the applications by day
      applicationDates.forEach(app => {
        if (responsesByDay[app.date] !== undefined) {
          responsesByDay[app.date] += 1;
        }
      });
      
      // Convert to array format for chart
      const applicationsOverTime = lastSevenDays.map(date => ({
        date,
        count: responsesByDay[date] || 0
      }));
      
      // Calculate conversion rate
      const conversionRate = applications.length > 0 
        ? Math.round((accepted / applications.length) * 100) 
        : 0;
      
      // Update stats state
      setStats({
        totalApplicants: applications.length,
        acceptedApplicants: accepted,
        pendingApplicants: pending,
        rejectedApplicants: rejected,
        availableSlots: parseInt(volunteering.availableSlots || 0),
        daysUntilEvent: daysUntil,
        responsesPerDay: Object.keys(responsesByDay).map(date => ({
          date,
          count: responsesByDay[date]
        })),
        applicationsOverTime,
        applicantGenders: genders,
        conversionRate
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      setLoading(false);
    }
  };
  
  // Generate pie chart data for application statuses
  const getStatusChartData = () => {
    return [
      {
        name: 'אושרו',
        count: stats.acceptedApplicants,
        color: '#4CAF50',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      },
      {
        name: 'בהמתנה',
        count: stats.pendingApplicants,
        color: '#FFC107',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      },
      {
        name: 'נדחו',
        count: stats.rejectedApplicants,
        color: '#F44336',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      },
    ];
  };

  // Generate data for gender distribution chart
  const getGenderChartData = () => {
    return [
      {
        name: 'גברים',
        count: stats.applicantGenders.male,
        color: '#3F51B5',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      },
      {
        name: 'נשים',
        count: stats.applicantGenders.female,
        color: '#E91E63',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      },
      {
        name: 'אחר',
        count: stats.applicantGenders.other,
        color: '#9C27B0',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      }
    ];
  };
  
  // Generate data for applications over time chart
  const getTimelineChartData = () => {
    return {
      labels: stats.applicationsOverTime.map(item => item.date.substring(0, 5)),
      datasets: [
        {
          data: stats.applicationsOverTime.map(item => item.count),
          color: (opacity = 1) => `rgba(140, 82, 255, ${opacity})`,
          strokeWidth: 2
        }
      ]
    };
  };
  
  // Generate chart config
  const chartConfig = {
    backgroundGradientFrom: "#fff",
    backgroundGradientTo: "#fff",
    color: (opacity = 1) => `rgba(140, 82, 255, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    decimalPlaces: 0,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
  };
  
  // Calculate fill percentage for slots
  const slotsFilledPercentage = () => {
    const total = stats.availableSlots;
    const filled = stats.acceptedApplicants;
    if (total === 0) return 0;
    return Math.min(100, Math.round((filled / total) * 100));
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
          
          <Animated.Text
            style={[
              styles.title,
              {
                opacity: fadeAnimation,
              },
            ]}
          >
            סטטיסטיקות התנדבות
          </Animated.Text>
          
          <View style={styles.placeholder} />
        </View>

        <Animated.Text
          style={[
            styles.volunteeringTitle,
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

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8c52ff" />
            <Text style={styles.loadingText}>טוען נתונים...</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
          >
            {/* חלק סטטיסטיקות עיקריות */}
            <Animated.View
              style={[
                styles.statsCard,
                {
                  opacity: cardsAnimation,
                  transform: [
                    {
                      translateY: cardsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [100, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.cardTitle}>סיכום מועמדויות</Text>
              
              <View style={styles.mainStatsContainer}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.totalApplicants}</Text>
                  <Text style={styles.statLabel}>סה"כ מועמדים</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, {color: '#4CAF50'}]}>
                    {stats.acceptedApplicants}
                  </Text>
                  <Text style={styles.statLabel}>אושרו</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, {color: '#FFC107'}]}>
                    {stats.pendingApplicants}
                  </Text>
                  <Text style={styles.statLabel}>בהמתנה</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, {color: '#F44336'}]}>
                    {stats.rejectedApplicants}
                  </Text>
                  <Text style={styles.statLabel}>נדחו</Text>
                </View>
              </View>
            </Animated.View>
            
            {/* מקומות פנויים */}
            <Animated.View
              style={[
                styles.statsCard,
                {
                  opacity: cardsAnimation,
                  transform: [
                    {
                      translateY: cardsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [120, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.cardTitle}>תפוסת מקומות</Text>
              
              <View style={styles.slotsContainer}>
                <View style={styles.slotInfo}>
                  <Text style={styles.slotTitle}>מקומות פנויים</Text>
                  <Text style={styles.slotValue}>
                    {Math.max(0, stats.availableSlots - stats.acceptedApplicants)} / {stats.availableSlots}
                  </Text>
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBackground}>
                    <View 
                      style={[
                        styles.progressBarFill, 
                        {width: `${slotsFilledPercentage()}%`}
                      ]} 
                    />
                  </View>
                  <Text style={styles.percentageText}>{slotsFilledPercentage()}% תפוס</Text>
                </View>
              </View>
            </Animated.View>
            
            {/* תרשים פאי של סטטוס */}
            {stats.totalApplicants > 0 && (
              <Animated.View
                style={[
                  styles.statsCard,
                  {
                    opacity: cardsAnimation,
                    transform: [
                      {
                        translateY: cardsAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [140, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.cardTitle}>התפלגות סטטוס מועמדויות</Text>
                
                <View style={styles.chartContainer}>
                  <PieChart
                    data={getStatusChartData()}
                    width={width - 80}
                    height={200}
                    chartConfig={chartConfig}
                    accessor="count"
                    backgroundColor="transparent"
                    paddingLeft="10"
                    absolute
                  />
                </View>
              </Animated.View>
            )}
            
           
            
            {/* תרשים פאי של מגדר */}
            {stats.totalApplicants > 0 && (
              <Animated.View
                style={[
                  styles.statsCard,
                  {
                    opacity: cardsAnimation,
                    transform: [
                      {
                        translateY: cardsAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [180, 0],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.cardTitle}>התפלגות מגדרית</Text>
                
                <View style={styles.chartContainer}>
                  <PieChart
                    data={getGenderChartData()}
                    width={width - 80}
                    height={200}
                    chartConfig={chartConfig}
                    accessor="count"
                    backgroundColor="transparent"
                    paddingLeft="10"
                    absolute
                  />
                </View>
              </Animated.View>
            )}
            
            {/* מידע נוסף */}
            <Animated.View
              style={[
                styles.statsCard,
                {
                  opacity: cardsAnimation,
                  transform: [
                    {
                      translateY: cardsAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [240, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.cardTitle}>מידע נוסף</Text>
              
              <View style={styles.additionalInfo}>
                <View style={styles.infoRow}>
                  <Ionicons name="calendar" size={20} color="#8c52ff" />
                  <Text style={styles.infoText}>
                    {stats.daysUntilEvent > 0 
                      ? `נותרו ${stats.daysUntilEvent} ימים עד לאירוע`
                      : stats.daysUntilEvent === 0
                        ? "האירוע מתקיים היום!"
                        : "האירוע התקיים"
                    }
                  </Text>
                </View>
                
              
                
                <View style={styles.infoRow}>
                  <Ionicons name="time" size={20} color="#8c52ff" />
                  <Text style={styles.infoText}>
                    זמן התנדבות: {volunteering.duration || "לא צוין"}
                  </Text>
                </View>
                
                <View style={styles.infoRow}>
                  <Ionicons name="location" size={20} color="#8c52ff" />
                  <Text style={styles.infoText}>
                    מיקום: {volunteering.location?.city || "לא צוין"}
                  </Text>
                </View>
                
              
                
                <View style={styles.infoRow}>
                  <Ionicons name="timer" size={20} color="#8c52ff" />
                  <Text style={styles.infoText}>
                    זמן ממוצע לטיפול בבקשה: 1.5 ימים
                  </Text>
                </View>
              </View>
            </Animated.View>
          </ScrollView>
        )}
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
  headerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    width: '100%',
    zIndex: 10,
  },
  backButton: {
    padding: 10,
    zIndex: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  placeholder: {
    width: 44, // match the width of the back button
  },
  volunteeringTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  statsCard: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8c52ff',
    marginBottom: 15,
    textAlign: 'center',
  },
  mainStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  statItem: {
    alignItems: 'center',
    margin: 5,
    minWidth: 70,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
    textAlign: 'center',
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  slotsContainer: {
    padding: 10,
  },
  slotInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  slotTitle: {
    fontSize: 16,
    color: '#333',
  },
  slotValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  progressBarContainer: {
    marginTop: 5,
  },
  progressBarBackground: {
    height: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#8c52ff',
  },
  percentageText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  additionalInfo: {
    padding: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoText: {
    fontSize: 16,
    color: '#333',
    marginRight: 10,
  },
  volunteerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  avatarContainer: {
    marginLeft: 15,
  },
  volunteerInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  volunteerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  volunteerEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  volunteerPhone: {
    fontSize: 14,
    color: '#666',
  },
});

export default VolunteeringStats;
