import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Modal,
  TextInput,
  ImageBackground,
  ScrollView,
  I18nManager,
  Alert,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { collection, query, getDocs, doc, getDoc, addDoc, deleteDoc, updateDoc, where } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { getAuth, signOut } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const ChildProfilesScreen = ({ navigation, route }) => {
  const [children, setChildren] = useState([]);
  const [filteredChildren, setFilteredChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // מצב הפרופיל החדש
  const [newProfile, setNewProfile] = useState({
    fullName: '',
    username: '',
    password: '',
    age: '',
  });
  
  // מצב הפרופיל שיש לערוך
  const [editingProfile, setEditingProfile] = useState({
    id: '',
    fullName: '',
    username: '',
    password: '',
    age: '',
    parentId: '',
  });

  const [addParentModalVisible, setAddParentModalVisible] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [parentIdNumber, setParentIdNumber] = useState('');

  // אנימציות חדשות
  const translateY = useRef(new Animated.Value(-800)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const listItemAnimations = useRef([]).current;
  
  // Animation values for menu
  const slideAnim = useRef(new Animated.Value(280)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const mainContentScale = useRef(new Animated.Value(1)).current;
  const mainContentTranslate = useRef(new Animated.Value(0)).current;
  
  const db = getFirestore();
  const auth = getAuth();
  const navigateToLocation = () => navigation.navigate('EmergencyLocationsScreen');
  const navigateToEditProfile = () => navigation.navigate('EditProfile_general', { userId: auth.currentUser.uid });
  const navigateToAlert = () => navigation.navigate('BeParent', { userId: auth.currentUser.uid });
  const navigateToEmergencyContacts = () => {
    navigation.navigate('EmergencyContactsScreen', { userId: auth.currentUser.uid });
  };
  // טעינת הפרופילים בעת טעינת המסך
  useEffect(() => {
    fetchChildProfiles();
    
    // הפעלת אנימציות
    Animated.timing(translateY, {
      toValue: -780,
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
  }, [children, searchText]);

  // עדכון אנימציות פריטי הרשימה
  useEffect(() => {
    if (filteredChildren.length > 0) {
      // איפוס מערך האנימציות אם גודל הרשימה השתנה
      if (listItemAnimations.length !== filteredChildren.length) {
        listItemAnimations.length = 0;
        filteredChildren.forEach(() => {
          listItemAnimations.push(new Animated.Value(0));
        });
      }
      
      // הפעלת אנימציה עבור כל פריט ברשימה עם עיכוב מדורג
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
  }, [filteredChildren]);

  // פונקציה להביא את כל פרופילי הילדים מבסיס הנתונים
  const fetchChildProfiles = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.error('No authenticated user found');
        setLoading(false);
        return;
      }
      
      const childProfilesRef = collection(db, 'childProfiles');
      const querySnapshot = await getDocs(childProfilesRef);
      
      // סינון לפי פרופילים השייכים להורה המחובר
      const childrenData = querySnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter(child => 
          child.parentId === currentUser.uid ||
          (Array.isArray(child.parentIds) && child.parentIds.includes(currentUser.uid))
        );
      
      setChildren(childrenData);
      setFilteredChildren(childrenData);
    } catch (error) {
      console.error('Error fetching child profiles:', error);
      alert('שגיאה בטעינת הפרופילים: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // פונקציה להוספת פרופיל ילד חדש
  const addChildProfile = async () => {
    // וידוא שכל השדות מלאים
    if (!newProfile.fullName || !newProfile.username || !newProfile.password || !newProfile.age) {
      alert('יש למלא את כל השדות');
      return;
    }

    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        alert('יש להתחבר למערכת כדי להוסיף פרופיל');
        setLoading(false);
        return;
      }
      
      // יצירת אובייקט הפרופיל עם שדה parentId
      const profileData = {
        fullName: newProfile.fullName,
        username: newProfile.username.toLowerCase(), // המרה לאותיות קטנות
        password: newProfile.password,
        age: parseInt(newProfile.age, 10) || 0,
        createdAt: new Date(),
        parentId: currentUser.uid,
      };
      
      // הוספת הפרופיל לבסיס הנתונים
      const docRef = await addDoc(collection(db, 'childProfiles'), profileData);
      
      // סגירת המודאל קודם כל לשיפור חוויית המשתמש
      setAddModalVisible(false);
      
      // איפוס הטופס
      setNewProfile({
        fullName: '',
        username: '',
        password: '',
        age: '',
      });
      
      // רענון הרשימה מיד
      await fetchChildProfiles();
      
      // הצגת הודעת הצלחה
      alert('הפרופיל נוסף בהצלחה');
      
    } catch (error) {
      console.error('Error adding child profile:', error);
      alert('שגיאה בהוספת הפרופיל: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // פונקציה למחיקת פרופיל ילד
  const deleteChildProfile = async (childId) => {
    try {
      Alert.alert(
        'מחיקת פרופיל',
        'האם אתה בטוח שברצונך למחוק פרופיל זה?',
        [
          {
            text: 'ביטול',
            style: 'cancel',
          },
          {
            text: 'מחק',
            style: 'destructive',
            onPress: async () => {
              setLoading(true);
              
              try {
                // מחיקת המסמך מבסיס הנתונים
                await deleteDoc(doc(db, 'childProfiles', childId));
                
                // עדכון מיידי של הרשימה המקומית לפני הפעלת fetchChildProfiles
                setChildren(prev => prev.filter(child => child.id !== childId));
                setFilteredChildren(prev => prev.filter(child => child.id !== childId));
                
                // רענון הרשימה בכל מקרה
                await fetchChildProfiles();
                
                // הצגת הודעה
                alert('הפרופיל נמחק בהצלחה');
              } catch (error) {
                console.error('Error deleting document:', error);
                alert('שגיאה במחיקת הפרופיל: ' + error.message);
              } finally {
                setLoading(false);
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error deleting child profile:', error);
      alert('שגיאה במחיקת הפרופיל: ' + error.message);
    }
  };

  // פונקציה לפתיחת מודאל עריכה
  const openEditModal = (child) => {
    setEditingProfile({
      id: child.id,
      fullName: child.fullName,
      username: child.username,
      password: child.password,
      age: child.age.toString(),
      parentId: child.parentId,
    });
    setEditModalVisible(true);
  };

  // פונקציה לעדכון פרופיל ילד
  const updateChildProfile = async () => {
    if (!editingProfile.fullName || !editingProfile.username || !editingProfile.password || !editingProfile.age) {
      alert('יש למלא את כל השדות');
      return;
    }

    try {
      setLoading(true);
      
      // עדכון הנתונים בבסיס הנתונים
      const childDocRef = doc(db, 'childProfiles', editingProfile.id);
      
      const updatedData = {
        fullName: editingProfile.fullName,
        username: editingProfile.username.toLowerCase(), // המרה לאותיות קטנות
        password: editingProfile.password,
        age: parseInt(editingProfile.age, 10) || 0,
        updatedAt: new Date(),
      };
      
      await updateDoc(childDocRef, updatedData);
      
      // סגירת המודאל קודם כל לשיפור חוויית המשתמש
      setEditModalVisible(false);
      
      // עדכון מיידי של הרשימה המקומית
      setChildren(prev => prev.map(child => 
        child.id === editingProfile.id
          ? { ...child, ...updatedData }
          : child
      ));
      
      // רענון הרשימה בכל מקרה
      await fetchChildProfiles();
      
      // הצגת הודעה
      alert('הפרופיל עודכן בהצלחה');
      
    } catch (error) {
      console.error('Error updating child profile:', error);
      alert('שגיאה בעדכון הפרופיל: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // החלת הפילטרים על רשימת הילדים
  const applyFilters = () => {
    // אם אין ילדים, אין מה לפלטר
    if (!children.length) return;
    
    let result = [...children];
    
    // פילטור לפי טקסט חיפוש
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      result = result.filter(child => 
        (child.fullName && child.fullName.toLowerCase().includes(searchLower)) ||
        (child.username && child.username.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredChildren(result);
  };

  // פונקציה להוספת הורה לפרופיל ילד
  const addParentToChild = async () => {
    if (!parentIdNumber) {
      alert('יש להזין מספר תעודת זהות');
      return;
    }

    try {
      setLoading(true);
      
      // חיפוש ההורה לפי תעודת זהות
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('id', '==', parentIdNumber));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        alert('לא נמצא הורה עם תעודת זהות זו');
        return;
      }
      
      const parentDoc = querySnapshot.docs[0];
      const parentId = parentDoc.id;
      
      // בדיקה שההורה לא כבר קיים בפרופיל הילד
      const childDoc = await getDoc(doc(db, 'childProfiles', selectedChildId));
      const childData = childDoc.data();
      
      if (childData.parentIds && childData.parentIds.includes(parentId)) {
        alert('ההורה כבר קיים בפרופיל זה');
        return;
      }
      
      // עדכון פרופיל הילד עם הורה נוסף
      const updatedParentIds = childData.parentIds ? [...childData.parentIds, parentId] : [childData.parentId, parentId];
      
      await updateDoc(doc(db, 'childProfiles', selectedChildId), {
        parentIds: updatedParentIds
      });
      
      // סגירת המודאל ואיפוס השדות
      setAddParentModalVisible(false);
      setParentIdNumber('');
      setSelectedChildId(null);
      
      // רענון הרשימה
      await fetchChildProfiles();
      
      alert('ההורה נוסף בהצלחה');
      
    } catch (error) {
      console.error('Error adding parent:', error);
      alert('שגיאה בהוספת ההורה: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // רינדור פריט ילד ברשימה
  const renderChildItem = ({ item, index }) => {
    // הגדרת אנימציה לפריט הנוכחי
    const itemAnimation = listItemAnimations[index] || new Animated.Value(1);
    
    // תמונת ברירת מחדל
    const profileImage = item.profilePicture 
      ? { uri: item.profilePicture } 
      : require('../../assets/kids.png');
      
    return (
      <Animated.View
        style={{
          opacity: itemAnimation,
          transform: [
            { translateY: itemAnimation.interpolate({
                inputRange: [0, 3],
                outputRange: [50, 0]
              })
            }
          ]
        }}
      >
        <TouchableOpacity 
          style={styles.childCard}
          onPress={() => navigation.navigate('ChildDetailsScreen', { childId: item.id })}
        >
          <LinearGradient
            colors={['rgba(250, 0, 233, 0.05)', 'rgba(255, 239, 87, 0.1)', 'rgba(250, 0, 233, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          />
          <View style={styles.childInfo}>
            <View style={styles.childMainInfo}>
              <View style={styles.childTextInfo}>
                <Text style={styles.childName}>{item.fullName}</Text>
                <Text style={styles.childUsername}>שם משתמש: {item.username}</Text>
                <Text style={styles.childAge}>גיל: {item.age}</Text>
              </View>
              <Image source={profileImage} style={styles.profileImage} />
            </View>
            
            {/* כפתורי עריכה, מחיקה והוספת הורה */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={[styles.actionButton, styles.addParentButton]} 
                onPress={() => {
                  setSelectedChildId(item.id);
                  setAddParentModalVisible(true);
                }}
              >
                <Ionicons name="person-add-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>הוספת הורה</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.editButton]} 
                onPress={() => openEditModal(item)}
              >
                <Ionicons name="create-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>עריכה</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.actionButton, styles.deleteButton]} 
                onPress={() => deleteChildProfile(item.id)}
              >
                <Ionicons name="trash-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>מחיקה</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  // רינדור מספר הילדים שנמצאו
  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.resultCount}>
        נמצאו {filteredChildren.length} פרופילים
      </Text>
    </View>
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigation.replace('Login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const openMenu = () => {
    setIsMenuOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0.6,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(mainContentScale, {
        toValue: 0.85,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(mainContentTranslate, {
        toValue: -50,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 280,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(mainContentScale, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(mainContentTranslate, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsMenuOpen(false);
    });
  };

  const toggleMenu = () => {
    if (isMenuOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  };

  return (
    <Pressable style={styles.container} onPress={closeMenu}>
      <ImageBackground
        style={styles.backgroundImage}
      >
        <Animated.View 
          style={[
            styles.mainContentContainer,
            {
              transform: [
                { scale: mainContentScale },
                { translateX: mainContentTranslate }
              ]
            }
          ]}
        >
          <View style={styles.container}>
            {/* חצי עיגול עם גרדיאנט - בהשראת Kids_zone */}
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
                style={styles.gradient}
              />
            </Animated.View>
            
            {/* כותרת */}
            <View style={styles.header}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.title}>פרופילי ילדים</Text>
              
              {/* כפתור הוספה */}
              <TouchableOpacity onPress={() => setAddModalVisible(true)} style={styles.addButton}>
                <Ionicons name="add-circle" size={32} color="white" />
              </TouchableOpacity>
            </View>
            
            {/* תיבת חיפוש */}
            <Animated.View 
              style={[styles.searchContainer, { opacity: fadeAnim }]}
            >
              <TextInput
                style={styles.searchInput}
                placeholder="חיפוש פרופילים..."
                value={searchText}
                onChangeText={setSearchText}
                placeholderTextColor="#7f8c8d"
              />
              <Ionicons name="search" size={24} color="#2c6975" />
            </Animated.View>
            
            {/* רשימת הילדים המסוננת */}
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
              {loading ? (
                <ActivityIndicator size="large" color="#fa00e9" style={styles.loader} />
              ) : (
                <FlatList
                  data={filteredChildren}
                  renderItem={renderChildItem}
                  keyExtractor={item => item.id}
                  contentContainerStyle={styles.list}
                  ListHeaderComponent={renderHeader}
                  ListEmptyComponent={
                    <View style={styles.emptyList}>
                      <Text style={styles.emptyTitle}>לא נמצאו פרופילים</Text>
                      <Text style={styles.emptyText}>לחץ על כפתור ה+ כדי להוסיף פרופיל ילד חדש</Text>
                    </View>
                  }
                />
              )}
            </Animated.View>
            
            {/* מודאל הוספת פרופיל */}
            <Modal
              visible={addModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setAddModalVisible(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <LinearGradient
                    colors={['rgba(250, 0, 233, 0.1)', 'rgba(255, 239, 87, 0.05)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalGradient}
                  />
                  <Text style={styles.modalTitle}>הוספת פרופיל ילד חדש</Text>
                  
                  <ScrollView style={styles.formContainer}>
                    {/* שם מלא */}
                    <Text style={styles.inputLabel}>שם מלא</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="הכנס שם מלא"
                      value={newProfile.fullName}
                      onChangeText={(text) => setNewProfile(prev => ({ ...prev, fullName: text }))}
                      textAlign="right"
                    />
                    
                    {/* שם משתמש */}
                    <Text style={styles.inputLabel}>שם משתמש</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="הכנס שם משתמש"
                      value={newProfile.username}
                      onChangeText={(text) => setNewProfile(prev => ({ ...prev, username: text }))}
                      textAlign="right"
                    />
                    
                    {/* סיסמה */}
                    <Text style={styles.inputLabel}>סיסמה</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="הכנס סיסמה"
                      value={newProfile.password}
                      onChangeText={(text) => setNewProfile(prev => ({ ...prev, password: text }))}
                      secureTextEntry={true}
                      textAlign="right"
                    />
                    
                    {/* גיל */}
                    <Text style={styles.inputLabel}>גיל</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="הכנס גיל"
                      value={newProfile.age}
                      onChangeText={(text) => setNewProfile(prev => ({ ...prev, age: text }))}
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </ScrollView>
                  
                  {/* כפתורי הפעולה */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.cancelButton]} 
                      onPress={() => {
                        setNewProfile({
                          fullName: '',
                          username: '',
                          password: '',
                          age: '',
                        });
                        setAddModalVisible(false);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>ביטול</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.modalButton} 
                      onPress={addChildProfile}
                    >
                      <Text style={styles.modalButtonText}>הוסף פרופיל</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
            
            {/* מודאל עריכת פרופיל */}
            <Modal
              visible={editModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setEditModalVisible(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <LinearGradient
                    colors={['rgba(250, 0, 233, 0.1)', 'rgba(255, 239, 87, 0.05)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalGradient}
                  />
                  <Text style={styles.modalTitle}>עריכת פרופיל ילד</Text>
                  
                  <ScrollView style={styles.formContainer}>
                    {/* שם מלא */}
                    <Text style={styles.inputLabel}>שם מלא</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="הכנס שם מלא"
                      value={editingProfile.fullName}
                      onChangeText={(text) => setEditingProfile(prev => ({ ...prev, fullName: text }))}
                      textAlign="right"
                    />
                    
                    {/* שם משתמש */}
                    <Text style={styles.inputLabel}>שם משתמש</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="הכנס שם משתמש"
                      value={editingProfile.username}
                      onChangeText={(text) => setEditingProfile(prev => ({ ...prev, username: text }))}
                      textAlign="right"
                    />
                    
                    {/* סיסמה */}
                    <Text style={styles.inputLabel}>סיסמה</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="הכנס סיסמה"
                      value={editingProfile.password}
                      onChangeText={(text) => setEditingProfile(prev => ({ ...prev, password: text }))}
                      secureTextEntry={true}
                      textAlign="right"
                    />
                    
                    {/* גיל */}
                    <Text style={styles.inputLabel}>גיל</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="הכנס גיל"
                      value={editingProfile.age}
                      onChangeText={(text) => setEditingProfile(prev => ({ ...prev, age: text }))}
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </ScrollView>
                  
                  {/* כפתורי הפעולה */}
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.cancelButton]} 
                      onPress={() => setEditModalVisible(false)}
                    >
                      <Text style={styles.cancelButtonText}>ביטול</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.modalButton} 
                      onPress={updateChildProfile}
                    >
                      <Text style={styles.modalButtonText}>עדכן פרופיל</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>

            {/* מודאל הוספת הורה */}
            <Modal
              visible={addParentModalVisible}
              transparent={true}
              animationType="slide"
              onRequestClose={() => setAddParentModalVisible(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <LinearGradient
                    colors={['rgba(250, 0, 233, 0.1)', 'rgba(255, 239, 87, 0.05)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.modalGradient}
                  />
                  <Text style={styles.modalTitle}>הוספת הורה לפרופיל</Text>
                  
                  <View style={styles.formContainer}>
                    <Text style={styles.inputLabel}>מספר תעודת זהות</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="הכנס מספר תעודת זהות"
                      value={parentIdNumber}
                      onChangeText={setParentIdNumber}
                      keyboardType="numeric"
                      textAlign="right"
                    />
                  </View>
                  
                  <View style={styles.modalActions}>
                    <TouchableOpacity 
                      style={[styles.modalButton, styles.cancelButton]} 
                      onPress={() => {
                        setParentIdNumber('');
                        setSelectedChildId(null);
                        setAddParentModalVisible(false);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>ביטול</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.modalButton} 
                      onPress={addParentToChild}
                    >
                      <Text style={styles.modalButtonText}>הוסף הורה</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>
          </View>
        </Animated.View>

        {isMenuOpen && (
          <>
            <Animated.View 
              style={[
                styles.overlay,
                { opacity: overlayOpacity }
              ]}
            >
              <TouchableOpacity 
                style={styles.overlayTouch}
                onPress={closeMenu}
                activeOpacity={1}
              />
            </Animated.View>
            
            <Animated.View 
              style={[
                styles.sideMenu,
                { 
                  transform: [{ translateX: slideAnim }],
                  shadowColor: '#000',
                  shadowOffset: { width: -5, height: 0 },
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  elevation: 20,
                }
              ]}
            >
              <View style={styles.menuHeader}>
                <Text style={styles.menuTitle}>תפריט</Text>
                <TouchableOpacity onPress={closeMenu} style={styles.closeButton}>
                  <Ionicons name="close" size={26} color="#fff" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.menuProfile}>
                <Image
                  source={require('../../assets/men.png')}
                  style={styles.menuProfileImage}
                />
                <Text style={styles.menuProfileName}>שלום!</Text>
                <Text style={styles.menuProfileSubtitle}>משתמש רשום</Text>
              </View>
              
              
              <View style={styles.menuContent}>
              <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    navigateToEditProfile();
                  }}
                >
                  <Text style={styles.menuTextOnly}>עריכת פרופיל</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    navigateToEmergencyContacts();
                  }}
                >
                  <Text style={styles.menuTextOnly}>אנשי חירום</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    navigateToLocation();
                  }}
                >
                  <Text style={styles.menuTextOnly}>אזורי התראה</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    closeMenu();
                    navigateToAlert();
                  }}
                >
                  <Text style={styles.menuTextOnly}>דף להורים</Text>
                </TouchableOpacity>
                
                <View style={styles.menuDivider} />
                
                <TouchableOpacity 
                  style={styles.logoutMenuItem}
                  onPress={() => {
                    closeMenu();
                    handleLogout();
                  }}
                >
                  <View style={styles.logoutTextContainer}>
                    <Text style={styles.logoutText}>התנתקות</Text>
                    <Text style={styles.logoutSubText}>יציאה מהמערכת</Text>
                  </View>
                  <View style={styles.logoutIconContainer}>
                    <Ionicons name="log-out" size={22} color="white" />
                  </View>
                </TouchableOpacity>
              </View>
              
              <View style={styles.menuFooter}>
                <Text style={styles.menuFooterText}>המרחב הבטוח שלך</Text>
                <View style={styles.menuFooterDot} />
              </View>
            </Animated.View>
          </>
        )}

        {/* פוטר עם גרדיאנט */}
        <View style={styles.footer}>
          <LinearGradient
            colors={['#fa00e9', '#ffef57', '#fa00e9']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.footerGradient}
          >
            <TouchableOpacity style={styles.footerButton} onPress={() => navigation.navigate('HomePage')}>
              <Image source={require('../../assets/house.png')} style={styles.footerIcon} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerButton} onPress={() => navigation.navigate('WhatToDo')}>
              <Image source={require('../../assets/mark.png')} style={styles.footerIcon} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerButton} onPress={() => navigation.navigate('ChatListScreen')}>
              <Image source={require('../../assets/love-2.png')} style={styles.footerIcon} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.footerButton} onPress={toggleMenu}>
              <Image source={require('../../assets/menu.png')} style={styles.footerIcon} />
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ImageBackground>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  // חצי עיגול חדש בהשראת Kids_zone
  halfCircle: {
    position: 'absolute',
    top: 0,
    left: width / 2 - 500,
    width: 1000,
    height: 1000,
    borderRadius: 600,
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
    left: 20,
  },
  addButton: {
    position: 'absolute',
    right: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: 400, // או ערך מוחלט כמו 300
  alignSelf: 'center',
  },
  searchInput: {
    flex: 1,
    height: 40,
    padding: 8,
    textAlign: 'right',
    color: '#34495e',
    fontWeight: '500',
  },
  list: {
    paddingBottom: 80,
  },
  listHeader: {
    padding: 10,
    backgroundColor: 'rgba(250, 0, 233, 0.05)',
    borderRadius: 10,
    marginTop: 60,
  },
  menuTextOnly: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c6975',
    textAlign: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  resultCount: {
    color: '#fa00e9',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  childCard: {
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
  childInfo: {
    flex: 1,
  },
  childMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    marginLeft: 15,
  },
  childTextInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  childName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c6975',
    marginBottom: 5,
    textAlign: 'right',
  },
  childUsername: {
    fontSize: 14,
    color: '#34495e',
    textAlign: 'right',
    marginBottom: 5,
  },
  childAge: {
    fontSize: 14,
    color: '#34495e',
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
  editButton: {
    backgroundColor: '#ef5fa7',
  },
  deleteButton: {
    backgroundColor: '#e94e77',
  },
  emptyList: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fa00e9',
    marginBottom: 10,
  },
  emptyText: {
    color: '#fa00e9',
    fontSize: 16,
    textAlign: 'center',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    maxHeight: '80%',
    position: 'relative',
    overflow: 'hidden',
  },
  modalGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fa00e9',
    marginBottom: 20,
    textAlign: 'center',
  },
  formContainer: {
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34495e',
    marginTop: 15,
    marginBottom: 8,
    textAlign: 'right',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#bdc3c7',
    borderRadius: 10,
    paddingHorizontal: 15,
    textAlign: 'right',
    backgroundColor: '#f9f9f9',
  },
  modalActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: '#fa00e9',
    borderRadius: 25,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  modalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#fa00e9',
  },
  cancelButtonText: {
    color: '#fa00e9',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'transparent',
  },
  footerGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  footerButton: {
    padding: 10,
  },
  footerIcon: {
    width: 30,
    height: 30,
    tintColor: 'white',
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
  addParentButton: {
    backgroundColor: '#f7b199',
  },
  mainContentContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    zIndex: 999,
  },
  overlayTouch: {
    flex: 1,
  },
  sideMenu: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 280,
    height: '100%',
    backgroundColor: '#fff',
    zIndex: 1000,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: -2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fd6ba7',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  menuTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'right',
  },
  menuProfile: {
    alignItems: 'center',
    paddingVertical: 25,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  menuProfileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#2c6975',
  },
  menuProfileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c6975',
    marginBottom: 4,
  },
  menuProfileSubtitle: {
    fontSize: 14,
    color: '#6c757d',
  },
  menuContent: {
    flex: 1,
    paddingTop: 10,
  },
  logoutMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
    justifyContent: 'space-between',
  },
  logoutTextContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e74c3c',
    textAlign: 'right',
    marginBottom: 2,
  },
  logoutSubText: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'right',
  },
  logoutIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e74c3c',
    marginLeft: 15,
  },
  menuFooter: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  menuFooterText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  menuFooterDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2c6975',
  },
});

export default ChildProfilesScreen;
