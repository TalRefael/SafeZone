import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
  ActivityIndicator,
  Modal,
  Animated,
  Dimensions
} from 'react-native';
import { getAuth } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  onSnapshot,
  doc,
  getDoc,
  deleteDoc,
  writeBatch,
  query as firestoreQuery
} from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const ChatListScreen = ({ navigation, route }) => {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filteredChats, setFilteredChats] = useState([]);
  const [chatSearchText, setChatSearchText] = useState('');
  const [childProfiles, setChildProfiles] = useState([]);

  // אנימציות
  const translateY = useRef(new Animated.Value(-800)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const listItemAnimations = useRef([]).current;

  const auth = getAuth();
  const db = getFirestore();
  const currentUser = auth.currentUser;
  const { childData, isChildUser } = route.params || {};
  
  // קביעת מזהה המשתמש הנוכחי
  const currentUserId = isChildUser ? childData?.id : currentUser?.uid;

  useEffect(() => {
    // אם זה משתמש ילד, נשתמש בנתוני הילד
    if (isChildUser && childData) {
      loadChatsForChild(childData);
    } else if (currentUser) {
      loadChats();
      loadChildProfiles();
    }
    
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
  }, [currentUser, childData, isChildUser]);

  // החל פילטרים בכל שינוי של חיפוש טקסט
  useEffect(() => {
    filterChats();
  }, [chats, chatSearchText]);

  // עדכון אנימציות פריטי הרשימה
  useEffect(() => {
    if (filteredChats.length > 0) {
      // איפוס מערך האנימציות אם גודל הרשימה השתנה
      if (listItemAnimations.length !== filteredChats.length) {
        listItemAnimations.length = 0;
        filteredChats.forEach(() => {
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
  }, [filteredChats]);

  const loadChildProfiles = async () => {
    try {
      const childProfileRef = collection(db, 'childProfiles');
      
      // יצירת שני קווריז - אחד ל-parentId ואחד ל-parentIds
      const q1 = query(childProfileRef, where('parentId', '==', currentUserId));
      const q2 = query(childProfileRef, where('parentIds', 'array-contains', currentUserId));
      
      // ביצוע שני החיפושים במקביל
      const [snapshot1, snapshot2] = await Promise.all([
        getDocs(q1),
        getDocs(q2)
      ]);
      
      // איחוד התוצאות תוך שמירה על ייחודיות
      const profilesMap = new Map();
      
      // הוספת תוצאות מ-parentId
      snapshot1.forEach((doc) => {
        profilesMap.set(doc.id, {
          id: doc.id,
          userId: doc.id,
          ...doc.data()
        });
      });
      
      // הוספת תוצאות מ-parentIds
      snapshot2.forEach((doc) => {
        if (!profilesMap.has(doc.id)) {
          profilesMap.set(doc.id, {
            id: doc.id,
            userId: doc.id,
            ...doc.data()
          });
        }
      });
      
      const profiles = Array.from(profilesMap.values());
      console.log("Found child profiles:", profiles);
      setChildProfiles(profiles);
    } catch (error) {
      console.error('Error loading child profiles:', error);
    }
  };
  // פונקציה לקבלת מידע על משתמש לפי ה-ID שלו
  const getUserInfoById = async (userId) => {
    try {
      // קודם כל נבדוק אם זה ילד
      const childProfileRef = doc(db, 'childProfiles', userId);
      const childSnap = await getDoc(childProfileRef);
      
      if (childSnap.exists()) {
        const childData = childSnap.data();
        return {
          userId: userId,
          displayName: childData.fullName || childData.username || "ילד/ה שלי",
          isChild: true,
          ...childData
        };
      }
      
      // אם זה לא ילד, נחפש במשתמשים הרגילים
      const userRef = collection(db, 'users');
      let userQuery = query(userRef, where('userId', '==', userId));
      let userSnap = await getDocs(userQuery);
      
      if (!userSnap.empty) {
        return userSnap.docs[0].data();
      }
      
      // אם לא נמצא, נסה לחפש לפי uid
      userQuery = query(userRef, where('uid', '==', userId));
      userSnap = await getDocs(userQuery);
      
      if (!userSnap.empty) {
        return userSnap.docs[0].data();
      }
      
      // אם עדיין לא נמצא, בדוק ישירות את מסמך המשתמש
      const directUserRef = doc(db, 'users', userId);
      const directUserSnap = await getDoc(directUserRef);
      
      if (directUserSnap.exists()) {
        return directUserSnap.data();
      }
      
      // אם לא נמצא שום דבר, החזר מידע בסיסי
      return { 
        userId: userId,
        email: "משתמש לא ידוע",
        displayName: "משתמש"
      };
    } catch (error) {
      console.error("Error getting user info:", error);
      return { 
        userId: userId,
        email: "משתמש לא ידוע",
        displayName: "משתמש"
      };
    }
  };
  
  // פונקציה למחיקת צ'אט
  const deleteChat = async (chatId) => {
    try {
      setLoading(true);
      const db = getFirestore();
      const batch = writeBatch(db);
      
      // מחיקת כל ההודעות בצ'אט
      const messagesRef = collection(db, 'chatMessages');
      const q = firestoreQuery(messagesRef, where('chatId', '==', chatId));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      // ביצוע המחיקה
      await batch.commit();
      
      // עדכון הממשק
      setChats(prevChats => prevChats.filter(chat => chat.chatId !== chatId));
      setLoading(false);
      
      console.log("Chat deleted successfully:", chatId);
    } catch (error) {
      console.error("Error deleting chat:", error);
      setLoading(false);
      Alert.alert("שגיאה", "אירעה שגיאה במחיקת הצ'אט");
    }
  };

  // פונקציה להצגת דיאלוג אישור מחיקה
  const confirmDeleteChat = (chatId, userName) => {
    Alert.alert(
      "מחיקת שיחה",
      `האם אתה בטוח שברצונך למחוק את השיחה עם ${userName}?`,
      [
        {
          text: "ביטול",
          style: "cancel"
        },
        { 
          text: "מחק", 
          style: "destructive",
          onPress: () => deleteChat(chatId)
        }
      ]
    );
  };
  
  // עדכון פונקציית טעינת הצ'אטים
  const loadChats = async () => {
    try {
      setLoading(true);

      // איסוף הודעות שבהם המשתמש הוא השולח או המקבל
      const messagesRef = collection(db, 'chatMessages');
      const q1 = query(
        messagesRef,
        where('senderId', '==', currentUserId),
        orderBy('timestamp', 'desc')
      );
      
      const q2 = query(
        messagesRef,
        where('receiverId', '==', currentUserId),
        orderBy('timestamp', 'desc')
      );

      // הגדרת מערך לשמירת הצ'אטים הייחודיים
      let uniqueChats = new Map();

      // האזנה להודעות חדשות בהן המשתמש הוא השולח
      const unsubscribe1 = onSnapshot(q1, async (snapshot) => {
        for (const doc of snapshot.docs) {
          const message = doc.data();
          const chatId = message.chatId;
          const otherUserId = message.receiverId;
          
          // בדיקה האם הצ'אט הוא עם ילד של המשתמש
          const isChildChat = childProfiles.some(child => child.id === otherUserId);
          
          if (!uniqueChats.has(chatId)) {
            // קבלת מידע על המשתמש האחר
            try {
              const userData = await getUserInfoById(otherUserId);
              
              uniqueChats.set(chatId, {
                chatId,
                userId: otherUserId,
                userName: getUserDisplayName(userData),
                lastMessage: message.text,
                timestamp: message.timestamp,
                unreadCount: 0,
                isChildChat // הוספת סימון אם זה צ'אט עם ילד
              });
              updateChatsState(uniqueChats);
            } catch (error) {
              console.error("Error getting user data:", error);
            }
          } else {
            // עדכון הודעה אחרונה אם יש חדשה יותר
            const existingChat = uniqueChats.get(chatId);
            if (message.timestamp && (!existingChat.timestamp || 
                message.timestamp.toDate() > existingChat.timestamp.toDate())) {
              existingChat.lastMessage = message.text;
              existingChat.timestamp = message.timestamp;
              // שמירת סימון אם זה צ'אט עם ילד (במקרה שהערך השתנה)
              existingChat.isChildChat = isChildChat;
              uniqueChats.set(chatId, existingChat);
              updateChatsState(uniqueChats);
            }
          }
        }
        setLoading(false);
      });

      // האזנה להודעות חדשות בהן המשתמש הוא המקבל
      const unsubscribe2 = onSnapshot(q2, async (snapshot) => {
        for (const doc of snapshot.docs) {
          const message = doc.data();
          const chatId = message.chatId;
          const otherUserId = message.senderId;
          
          // ספירת הודעות שלא נקראו
          let unreadCount = 0;
          if (!message.read) {
            unreadCount = 1;
          }
          
          // בדיקה האם הצ'אט הוא עם ילד של המשתמש
          const isChildChat = childProfiles.some(child => child.id === otherUserId);
          
          if (!uniqueChats.has(chatId)) {
            // קבלת מידע על המשתמש האחר
            try {
              const userData = await getUserInfoById(otherUserId);
              
              uniqueChats.set(chatId, {
                chatId,
                userId: otherUserId,
                userName: getUserDisplayName(userData),
                lastMessage: message.text,
                timestamp: message.timestamp,
                unreadCount,
                isChildChat // הוספת סימון אם זה צ'אט עם ילד
              });
              
              updateChatsState(uniqueChats);
            } catch (error) {
              console.error("Error getting user data:", error);
            }
          } else {
            // עדכון הודעה אחרונה והודעות שלא נקראו
            const existingChat = uniqueChats.get(chatId);
            if (message.timestamp && (!existingChat.timestamp || 
                message.timestamp.toDate() > existingChat.timestamp.toDate())) {
              existingChat.lastMessage = message.text;
              existingChat.timestamp = message.timestamp;
              existingChat.unreadCount += unreadCount;
              // שמירת סימון אם זה צ'אט עם ילד (במקרה שהערך השתנה)
              existingChat.isChildChat = isChildChat;
              uniqueChats.set(chatId, existingChat);
              updateChatsState(uniqueChats);
            }
          }
        }
        setLoading(false);
      });

      return () => {
        unsubscribe1();
        unsubscribe2();
      };
    } catch (error) {
      console.error('Error loading chats:', error);
      setLoading(false);
      Alert.alert('שגיאה', 'לא ניתן לטעון את הצ\'אטים');
    }
  };

  const loadChatsForChild = async (childData) => {
    try {
      setLoading(true);
      const messagesRef = collection(db, 'chatMessages');
      
      // איסוף הודעות שבהם הילד הוא השולח או המקבל
      const q1 = query(
        messagesRef,
        where('senderId', '==', childData.id),
        orderBy('timestamp', 'desc')
      );
      
      const q2 = query(
        messagesRef,
        where('receiverId', '==', childData.id),
        orderBy('timestamp', 'desc')
      );

      // הגדרת מערך לשמירת הצ'אטים הייחודיים
      let uniqueChats = new Map();

      // האזנה להודעות חדשות בהן הילד הוא השולח
      const unsubscribe1 = onSnapshot(q1, async (snapshot) => {
        for (const doc of snapshot.docs) {
          const message = doc.data();
          const chatId = message.chatId;
          const otherUserId = message.receiverId;
          
          if (!uniqueChats.has(chatId)) {
            try {
              const userData = await getUserInfoById(otherUserId);
              
              uniqueChats.set(chatId, {
                chatId,
                userId: otherUserId,
                userName: getUserDisplayName(userData),
                lastMessage: message.text,
                timestamp: message.timestamp,
                unreadCount: 0,
                isChildChat: false // זה לא צ'אט של ילד כי הילד הוא השולח
              });
              updateChatsState(uniqueChats);
            } catch (error) {
              console.error("Error getting user data:", error);
            }
          } else {
            const existingChat = uniqueChats.get(chatId);
            if (message.timestamp && (!existingChat.timestamp || 
                message.timestamp.toDate() > existingChat.timestamp.toDate())) {
              existingChat.lastMessage = message.text;
              existingChat.timestamp = message.timestamp;
              uniqueChats.set(chatId, existingChat);
              updateChatsState(uniqueChats);
            }
          }
        }
        setLoading(false);
      });

      // האזנה להודעות חדשות בהן הילד הוא המקבל
      const unsubscribe2 = onSnapshot(q2, async (snapshot) => {
        for (const doc of snapshot.docs) {
          const message = doc.data();
          const chatId = message.chatId;
          const otherUserId = message.senderId;
          
          let unreadCount = 0;
          if (!message.read) {
            unreadCount = 1;
          }
          
          if (!uniqueChats.has(chatId)) {
            try {
              const userData = await getUserInfoById(otherUserId);
              
              uniqueChats.set(chatId, {
                chatId,
                userId: otherUserId,
                userName: getUserDisplayName(userData),
                lastMessage: message.text,
                timestamp: message.timestamp,
                unreadCount,
                isChildChat: false // זה לא צ'אט של ילד כי הילד הוא המקבל
              });
              
              updateChatsState(uniqueChats);
            } catch (error) {
              console.error("Error getting user data:", error);
            }
          } else {
            const existingChat = uniqueChats.get(chatId);
            if (message.timestamp && (!existingChat.timestamp || 
                message.timestamp.toDate() > existingChat.timestamp.toDate())) {
              existingChat.lastMessage = message.text;
              existingChat.timestamp = message.timestamp;
              existingChat.unreadCount += unreadCount;
              uniqueChats.set(chatId, existingChat);
              updateChatsState(uniqueChats);
            }
          }
        }
        setLoading(false);
      });

      return () => {
        unsubscribe1();
        unsubscribe2();
      };
    } catch (error) {
      console.error('Error loading chats for child:', error);
      setLoading(false);
      Alert.alert('שגיאה', 'לא ניתן לטעון את הצ\'אטים');
    }
  };

  // פונקציה לקבלת שם תצוגה של משתמש בצורה עקבית
  const getUserDisplayName = (userData) => {
    if (!userData) return "משתמש";
    
    return userData.firstName || 
           userData.displayName || 
           userData.name || 
           userData.email || 
           "משתמש";
  };

  const updateChatsState = (chatsMap) => {
    // מיון הצ'אטים לפי תאריך אחרון
    const chatsArray = Array.from(chatsMap.values()).sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return b.timestamp.toDate() - a.timestamp.toDate();
    });
    
    setChats(chatsArray);
  };

  const filterChats = () => {
    if (!chats.length) {
      setFilteredChats([]);
      return;
    }
    
    let result = [...chats];
    
    // פילטור לפי טקסט חיפוש
    if (chatSearchText) {
      const searchLower = chatSearchText.toLowerCase();
      result = result.filter(chat => 
        (chat.userName && chat.userName.toLowerCase().includes(searchLower)) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredChats(result);
  };

  const searchUsers = async () => {
    if (!searchText.trim()) return;
    
    setSearchLoading(true);
    try {
      // אם זה משתמש ילד, נחפש רק את ההורים והאחים שלו
      if (isChildUser && childData) {
        let results = [];
        
        console.log("Child Data:", childData);
        
        // חיפוש ההורים - שינוי הלוגיקה לחיפוש
        const parentRef = collection(db, 'users');
        
        // פונקציה עזר לחיפוש הורה לפי ID
        const searchParentById = async (parentId) => {
          // נחפש את ההורה בכל השדות האפשריים
          const parentQueries = [
            query(parentRef, where('uid', '==', parentId)),
            query(parentRef, where('userId', '==', parentId)),
            query(parentRef, where('id', '==', parentId)),
            query(parentRef, where('user_id', '==', parentId)),
            query(parentRef, where('userID', '==', parentId))
          ];
          
          // נבדוק גם את המסמך ישירות
          try {
            const directParentDoc = doc(db, 'users', parentId);
            const directParentSnap = await getDoc(directParentDoc);
            if (directParentSnap.exists()) {
              console.log("Found parent directly by document ID");
              const parentData = directParentSnap.data();
              console.log("Direct parent data:", parentData);
              
              const displayName = getUserDisplayName(parentData);
              const username = parentData.username || '';
              const firstName = parentData.firstName || '';
              const lastName = parentData.lastName || '';
              const name = parentData.name || '';
              
              // בדיקה אם השם של ההורה תואם לחיפוש
              const searchLower = searchText.toLowerCase();
              const parentNameMatches = 
                displayName.toLowerCase().includes(searchLower) ||
                username.toLowerCase().includes(searchLower) ||
                firstName.toLowerCase().includes(searchLower) ||
                lastName.toLowerCase().includes(searchLower) ||
                name.toLowerCase().includes(searchLower);
                
              console.log("Search text:", searchText);
              console.log("Parent name matches:", parentNameMatches);
              
              if (parentNameMatches) {
                return {
                  id: parentId,
                  userId: parentId,
                  displayName: displayName,
                  username: username || displayName,
                  email: parentData.email || displayName,
                  uniqueId: parentId,
                  isChild: false,
                  isParent: true
                };
              }
            }
          } catch (error) {
            console.log("Error checking direct document:", error);
          }
          
          // נבדוק כל שאילתה עד שנמצא את ההורה
          for (const parentQuery of parentQueries) {
            try {
              const parentSnapshot = await getDocs(parentQuery);
              if (!parentSnapshot.empty) {
                const parentData = parentSnapshot.docs[0].data();
                console.log("Found parent with query:", parentQuery, parentData);
                
                const displayName = getUserDisplayName(parentData);
                const username = parentData.username || '';
                const firstName = parentData.firstName || '';
                const lastName = parentData.lastName || '';
                const name = parentData.name || '';
                
                // בדיקה אם השם של ההורה תואם לחיפוש
                const searchLower = searchText.toLowerCase();
                const parentNameMatches = 
                  displayName.toLowerCase().includes(searchLower) ||
                  username.toLowerCase().includes(searchLower) ||
                  firstName.toLowerCase().includes(searchLower) ||
                  lastName.toLowerCase().includes(searchLower) ||
                  name.toLowerCase().includes(searchLower);
                  
                console.log("Search text:", searchText);
                console.log("Parent name matches:", parentNameMatches);
                
                if (parentNameMatches) {
                  return {
                    id: parentId,
                    userId: parentId,
                    displayName: displayName,
                    username: username || displayName,
                    email: parentData.email || displayName,
                    uniqueId: parentId,
                    isChild: false,
                    isParent: true
                  };
                }
                break;
              }
            } catch (error) {
              console.log("Error with query:", parentQuery, error);
            }
          }
          return null;
        };

        // חיפוש לפי parentId
        if (childData.parentId) {
          const parentResult = await searchParentById(childData.parentId);
          if (parentResult) {
            results.push(parentResult);
          }
        }

        // חיפוש לפי parentIds
        if (childData.parentIds && Array.isArray(childData.parentIds)) {
          for (const parentId of childData.parentIds) {
            // דילוג אם זה אותו ID שכבר חיפשנו
            if (childData.parentId === parentId) continue;
            
            const parentResult = await searchParentById(parentId);
            if (parentResult) {
              results.push(parentResult);
            }
          }
        }
        
        // חיפוש האחים - שימוש בשני השדות
        const siblingsRef = collection(db, 'childProfiles');
        const siblingsQueries = [];
        
        // הוספת קוורי ל-parentId
        if (childData.parentId) {
          siblingsQueries.push(
            query(siblingsRef, where('parentId', '==', childData.parentId))
          );
        }
        
        // הוספת קווריז ל-parentIds
        if (childData.parentIds && Array.isArray(childData.parentIds)) {
          childData.parentIds.forEach(parentId => {
            siblingsQueries.push(
              query(siblingsRef, where('parentIds', 'array-contains', parentId))
            );
          });
        }
        
        // ביצוע כל החיפושים במקביל
        const siblingsSnapshots = await Promise.all(
          siblingsQueries.map(q => getDocs(q))
        );
        
        // איחוד התוצאות תוך שמירה על ייחודיות
        const siblingsMap = new Map();
        
        siblingsSnapshots.forEach(snapshot => {
          snapshot.forEach(doc => {
            const siblingData = doc.data();
            // דילוג על המשתמש הנוכחי
            if (doc.id !== childData.id && !siblingsMap.has(doc.id)) {
              const siblingName = siblingData.fullName || siblingData.username || '';
              
              // בדיקה אם האח מתאים לחיפוש
              if (siblingName.toLowerCase().includes(searchText.toLowerCase())) {
                siblingsMap.set(doc.id, {
                  id: doc.id,
                  userId: doc.id,
                  displayName: siblingName,
                  username: siblingData.username || siblingName,
                  email: 'אח/אחות שלי',
                  uniqueId: doc.id,
                  isChild: true,
                  childAge: siblingData.age || null
                });
              }
            }
          });
        });
        
        // הוספת האחים לתוצאות
        results.push(...Array.from(siblingsMap.values()));
        
        console.log("Final search results:", results);
        setSearchResults(results);
        setSearchLoading(false);
        return;
      }
      
      // אם זה משתמש רגיל (הורה), נמשיך עם החיפוש הרגיל
      const usersRef = collection(db, 'users');
      let results = [];
      
      // קבלת כל המשתמשים ופילטור בצד הלקוח
      const snapshot = await getDocs(usersRef);
      
      snapshot.forEach(doc => {
        const userData = doc.data();
        
        // בדיקה שלא מציגים את המשתמש הנוכחי
        if (userData.userId !== currentUserId && userData.uid !== currentUserId) {
          
          // חיפוש בשדות שונים
          const displayName = getUserDisplayName(userData);
          const username = userData.username || userData.userName || '';
          const firstName = userData.firstName || '';
          const lastName = userData.lastName || '';
          const name = userData.name || '';
          const uniqueId = userData.uniqueId || userData.id || '';
          
          // חיפוש בכל השדות הרלוונטיים
          const searchLower = searchText.toLowerCase();
          
          if (username.toLowerCase().includes(searchLower) || 
              displayName.toLowerCase().includes(searchLower) || 
              firstName.toLowerCase().includes(searchLower) || 
              lastName.toLowerCase().includes(searchLower) || 
              name.toLowerCase().includes(searchLower) || 
              uniqueId.includes(searchText)) {
            
            // שמירת המידע הבסיסי
            const resultUser = {
              id: doc.id,
              userId: userData.userId || userData.uid || doc.id,
              displayName: displayName,
              username: username || displayName,
              email: userData.email || name || displayName,
              uniqueId: uniqueId,
              isChild: false
            };
            
            results.push(resultUser);
          }
        }
      });
      
      // חיפוש בפרופילי הילדים
      if (childProfiles.length > 0) {
        childProfiles.forEach(child => {
          const childName = child.fullName || child.username || '';
          const searchLower = searchText.toLowerCase();
          
          if (childName.toLowerCase().includes(searchLower)) {
            results.push({
              id: child.id,
              userId: child.id,
              displayName: childName,
              username: child.username || childName,
              email: `הילד/ה שלי`,
              uniqueId: child.id,
              isChild: true,
              childAge: child.age14 || null
            });
          }
        });
      }
      
      console.log("Found users and children:", results);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
      Alert.alert('שגיאה', 'לא ניתן לחפש משתמשים');
    } finally {
      setSearchLoading(false);
    }
  };
  

  const startChat = (user) => {
    // לוג לבדיקה
    console.log("Starting chat with user:", user);
    
    // וידוא שיש לנו userId תקין
    if (!user.userId) {
      console.error("Missing userId for chat");
      Alert.alert('שגיאה', 'לא ניתן להתחיל צ\'אט עם משתמש זה');
      return;
    }
    
    // יצירת מזהה צ'אט ייחודי
    const chatId = [currentUserId, user.userId].sort().join('_');
    
    // סגירת המודל
    setSearchModalVisible(false);
    setSearchText('');
    setSearchResults([]);
    
    // מעבר למסך הצ'אט עם כל הפרמטרים הנדרשים
    navigation.navigate('ChatScreen', {
      chatId: chatId,
      volunteerId: user.userId,
      volunteerName: user.displayName || user.email,
      currentUserId: currentUserId
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = timestamp.toDate();
    const now = new Date();
    
    // היום
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // אתמול
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'אתמול';
    }
    
    // השבוע האחרון
    const daysDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
      return days[date.getDay()];
    }
    
    // אחרת
    return date.toLocaleDateString();
  };

  const renderChatItem = ({ item, index }) => {
    // הגדרת אנימציה לפריט הנוכחי
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
        <View style={[
          styles.chatCard,
        ]}>
          <LinearGradient
            colors={['rgba(44, 105, 117, 0.05)', 'rgba(79, 157, 166, 0.1)', 'rgba(44, 105, 117, 0.05)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          />
          
          {/* כפתור מחיקה */}
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => confirmDeleteChat(item.chatId, item.userName)}
          >
            <Ionicons name="trash-outline" size={22} color="#e74c3c" />
          </TouchableOpacity>
          
          {/* תוכן הצ'אט עם מידע על המשתמש */}
          <TouchableOpacity 
            style={styles.chatContent}
            onPress={() => {
              if (!item.userId) {
                console.error("Missing userId for chat item:", item);
                Alert.alert('שגיאה', 'לא ניתן לפתוח צ\'אט זה');
                return;
              }
              
              const chatId = item.chatId || [currentUserId, item.userId].sort().join('_');
              
              navigation.navigate('ChatScreen', { 
                chatId: chatId,
                volunteerId: item.userId,
                volunteerName: item.userName || 'משתמש',
                currentUserId: currentUserId
              });
            }}
          >
            <View style={styles.chatInfo}>
              <View style={styles.chatMainInfo}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {item.userName ? item.userName.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                  {item.unreadCount > 0 && (
                    <View style={styles.badgeContainer}>
                      <Text style={styles.badgeText}>{item.unreadCount}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.chatTextInfo}>
                  <View style={styles.nameTimeContainer}>
                    <Text style={styles.timeText}>
                      {item.timestamp ? formatTime(item.timestamp) : ''}
                    </Text>
                    <Text style={styles.chatName}>
                      {isChildUser && item.isChild ? 'אח/אחות שלי' : item.userName}
                    </Text>
                  </View>
                  <Text 
                    style={[
                      styles.lastMessage, 
                      item.unreadCount > 0 ? styles.unreadMessage : null
                    ]}
                    numberOfLines={1}
                  >
                    {item.lastMessage || 'לא קיימות הודעות'}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  const renderHeader = () => (
    <View style={styles.listHeader}>
      <Text style={styles.resultCount}>
        {filteredChats.length > 0 ? `נמצאו ${filteredChats.length} שיחות` : 'לא נמצאו שיחות'}
      </Text>
    </View>
  );

  const renderSearchUserItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.searchResultItem} 
      onPress={() => {
        if (!item.userId) {
          console.error("Missing userId for search result:", item);
          Alert.alert('שגיאה', 'לא ניתן להתחיל צ\'אט עם משתמש זה');
          return;
        }
        
        startChat(item);
      }}
    >
      <View style={styles.searchResultContent}>
        <Text style={styles.searchResultName}>{item.displayName}</Text>
        {/* הצגת טקסט מתאים בהתאם לסוג המשתמש */}
        {item.isParent ? (
          <View style={[styles.childBadge, styles.parentBadge]}>
            <Text style={[styles.childBadgeText, styles.parentBadgeText]}>אבא/אמא שלי</Text>
          </View>
        ) : item.isChild ? (
          <View style={styles.childBadge}>
            <Text style={styles.childBadgeText}>
              {isChildUser ? 'אח/אחות שלי' : 'הילד/ה שלי'}
            </Text>
            {item.childAge && <Text style={styles.childAge}>גיל: {item.childAge}</Text>}
          </View>
        ) : (
          item.username && item.username !== item.displayName && (
            <Text style={styles.searchResultUsername}>@{item.username}</Text>
          )
        )}
      </View>
      <View style={[
        styles.searchResultAvatar,
        item.isChild ? styles.childSearchAvatar : null,
        item.isParent ? styles.parentSearchAvatar : null
      ]}>
        <Text style={[
          styles.searchResultAvatarText,
          item.isChild ? styles.childAvatarText : null,
          item.isParent ? styles.parentAvatarText : null
        ]}>
          {item.displayName ? item.displayName.charAt(0).toUpperCase() : 'U'}
        </Text>
      </View>
    </TouchableOpacity>
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
        <Text style={styles.title}>הודעות</Text>
        
        {/* כפתור חיפוש */}
        <TouchableOpacity onPress={() => setSearchModalVisible(true)} style={styles.addButton}>
          <Ionicons name="person-add" size={32} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* תיבת חיפוש */}
      <Animated.View 
        style={[styles.searchContainer, { opacity: fadeAnim }]}
      >
        <TextInput
          style={styles.searchInput}
          placeholder="חיפוש בהודעות..."
          value={chatSearchText}
          onChangeText={setChatSearchText}
          placeholderTextColor="#7f8c8d"
        />
        <Ionicons name="search" size={24} color="#2c6975" />
      </Animated.View>

      {/* רשימת הצ'אטים המסוננת */}
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {loading ? (
          <ActivityIndicator size="large" color="#2c6975" style={styles.loader} />
        ) : (
          <FlatList
            data={filteredChats}
            renderItem={renderChatItem}
            keyExtractor={(item) => item.chatId || `${item.userId}_${Date.now()}`}
            contentContainerStyle={styles.list}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Ionicons name="chatbubble-ellipses-outline" size={60} color="#2c6975" />
                <Text style={styles.emptyTitle}>אין שיחות</Text>
                <Text style={styles.emptyText}>התחל שיחה חדשה עם כפתור + למעלה</Text>
              </View>
            }
          />
        )}
      </Animated.View>

      {/* מודאל חיפוש משתמשים */}
      <Modal
        visible={searchModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSearchModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['rgba(44, 105, 117, 0.1)', 'rgba(79, 157, 166, 0.05)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalGradient}
            />
            <Text style={styles.modalTitle}>חיפוש משתמשים</Text>
            
            <View style={styles.modalSearchContainer}>
  <TouchableOpacity onPress={searchUsers} style={styles.searchButton}>
    <Ionicons name="search" size={24} color="white" />
  </TouchableOpacity>
  <TextInput
    style={styles.modalSearchInput}
    placeholder="חפש לפי שם משתמש..."  // שינוי מאימייל לשם משתמש
    value={searchText}
    onChangeText={setSearchText}
    onSubmitEditing={searchUsers}
    textAlign="right"
  />
</View>
            
            {searchLoading ? (
              <ActivityIndicator size="large" color="#2c6975" style={styles.searchLoader} />
            ) : (
              <FlatList
                data={searchResults}
                renderItem={renderSearchUserItem}
                keyExtractor={(item) => item.id}
                style={styles.searchResults}
                ListEmptyComponent={
                  searchText.trim() ? (
                    <View style={styles.noResults}>
                      <Text style={styles.noResultsText}>לא נמצאו משתמשים</Text>
                    </View>
                  ) : null
                }
              />
            )}
            
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => {
                setSearchModalVisible(false);
                setSearchText('');
                setSearchResults([]);
              }}
            >
              <Text style={styles.modalCloseButtonText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  // חצי עיגול בהשראת מסך פרופילי הילדים
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
  addButton: {
    position: 'absolute',
    right: 0,
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
  chatCard: {
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
  chatInfo: {
    flex: 1,
  },
  chatMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  avatarContainer: {
    position: 'relative',
    marginLeft: 15,
  },
  searchResultUsername: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '500',
  },
  swipeActionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteSwipe: {
    backgroundColor: '#e74c3c',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
  },
  swipeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginTop: 5,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(44, 105, 117, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
  badgeContainer: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatTextInfo: {
    flex: 1,
  },
  nameTimeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  chatName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c6975',
    textAlign: 'right',
  },
  timeText: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  lastMessage: {
    fontSize: 14,
    color: '#34495e',
    textAlign: 'right',
  },
  unreadMessage: {
    fontWeight: 'bold',
    color: '#2c6975',
  },
  emptyList: {
    flex: 1,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c6975',
    marginTop: 20,
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
  // מודאל חיפוש משתמשים
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  childSearchAvatar: {
    backgroundColor: 'rgba(155, 89, 182, 0.3)', // צבע סגול בהיר לילדים
  },
  childAvatarText: {
    color: '#8e44ad', // צבע סגול כהה יותר לטקסט
  },
  childBadge: {
    backgroundColor: 'rgba(155, 89, 182, 0.1)',
    borderRadius: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginVertical: 3,
  },
  childBadgeText: {
    color: '#8e44ad',
    fontSize: 12,
    fontWeight: 'bold',
  },
  childAge: {
    color: '#9b59b6',
    fontSize: 10,
    marginTop: 2,
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
    color: '#2c6975',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSearchContainer: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
    overflow: 'hidden',
  },
  modalSearchInput: {
    flex: 1,
    height: 50,
    paddingHorizontal: 15,
    textAlign: 'right',
  },
  searchButton: {
    backgroundColor: '#2c6975',
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResults: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchResultContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c6975',
    marginBottom: 5,
  },
  searchResultEmail: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  searchResultAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(44, 105, 117, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  searchResultAvatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c6975',
  },
  noResults: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#7f8c8d',
    fontSize: 16,
  },
  searchLoader: {
    padding: 20,
  },
  modalCloseButton: {
    backgroundColor: '#2c6975',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  modalCloseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // תוספות עיצוביות תואמות לסגנון החדש
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
  cardSeparator: {
    height: 1,
    backgroundColor: 'rgba(44, 105, 117, 0.1)',
    marginVertical: 8,
  },
  chatStatusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2ecc71',
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 1,
    borderColor: 'white',
  },
  searchIcon: {
    marginLeft: 10,
  },
  filterButton: {
    flexDirection: 'row',
    backgroundColor: 'rgba(44, 105, 117, 0.1)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginLeft: 10,
  },
  filterButtonText: {
    color: '#2c6975',
    fontSize: 12,
    marginRight: 5,
    fontWeight: 'bold',
  },
  filtersContainer: {
    flexDirection: 'row-reverse',
    marginVertical: 10,
    paddingHorizontal: 5,
  },
  swipeActionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteSwipe: {
    backgroundColor: '#e74c3c',
  },
  archiveSwipe: {
    backgroundColor: '#3498db',
  },
  swipeText: {
    color: 'white',
    fontWeight: 'bold',
  },
  messagePreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  messageStatusIcon: {
    marginRight: 5,
  },
  chatCardPressed: {
    backgroundColor: 'rgba(44, 105, 117, 0.1)',
  },
  newChatButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  newChatButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 15,
  },
  newChatButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 10,
  },
  scrollToTopButton: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(44, 105, 117, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  tutorialContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  tutorialBox: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '85%',
    alignItems: 'center',
  },
  tutorialTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c6975',
    marginBottom: 15,
    textAlign: 'center',
  },
  tutorialText: {
    fontSize: 16,
    color: '#34495e',
    textAlign: 'center',
    marginBottom: 20,
  },
  tutorialButton: {
    backgroundColor: '#2c6975',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  tutorialButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  // אנימציות טעינה מותאמות לסגנון החדש
  skeletonContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  skeletonAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(44, 105, 117, 0.1)',
    marginLeft: 15,
  },
  skeletonContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  skeletonName: {
    height: 18,
    width: '40%',
    backgroundColor: 'rgba(44, 105, 117, 0.1)',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonMessage: {
    height: 14,
    width: '80%',
    backgroundColor: 'rgba(44, 105, 117, 0.1)',
    borderRadius: 4,
  },
  // RTL תמיכה
  rtlContainer: {
    flexDirection: 'row-reverse',
  },
  rtlText: {
    textAlign: 'right',
  },
  // תוספות חדשות שמותאמות לסגנון החדש
  importContactContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  importContactButton: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(44, 105, 117, 0.1)',
    borderRadius: 10,
    padding: 12,
  },
  importContactText: {
    color: '#2c6975',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  audioMessageIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  audioWaveform: {
    width: 50,
    height: 15,
    marginRight: 5,
  },
  audioDuration: {
    fontSize: 12,
    color: '#7f8c8d',
  },
  messageTimestamp: {
    fontSize: 12,
    color: '#7f8c8d',
    marginLeft: 5,
  },
  formError: {
    color: '#e74c3c',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 5,
  },
  chatBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  parentBadge: {
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
  },
  parentBadgeText: {
    color: '#3498db',
  },
  parentSearchAvatar: {
    backgroundColor: 'rgba(52, 152, 219, 0.3)',
  },
  parentAvatarText: {
    color: '#2980b9',
  },
});

export default ChatListScreen;
