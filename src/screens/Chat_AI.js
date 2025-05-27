import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  Animated,
  Text,
  ImageBackground,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal } from 'react-native';
import { getAuth, signOut } from 'firebase/auth';

const { width, height } = Dimensions.get('window');

const Chat_AI =  ({ navigation, route }) => {
  const { source, childData } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [conversationContext, setConversationContext] = useState({
    stage: 'initial', // initial, assessment, tools, practice, followup
    identifiedIssues: [],
    suggestedTools: [],
    sessionCount: 0
  });
  const scrollViewRef = useRef();

  // Menu animations
  const slideAnim = useRef(new Animated.Value(280)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const mainContentScale = useRef(new Animated.Value(1)).current;
  const mainContentTranslate = useRef(new Animated.Value(0)).current;

  // Circle animations
  const translateY = useRef(new Animated.Value(-800)).current;
  const titleAnimation = useRef(new Animated.Value(0)).current;
  const buttonAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const auth = getAuth();

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

  const closeMenuAndNotifications = () => {
    if (isMenuOpen) {
      closeMenu();
    }
  };

  // Navigation functions
  const navigateToEditProfile = () => {
    closeMenu();
    navigation.navigate('EditProfile_general', { userId: auth.currentUser.uid });
  };

  const navigateToEmergencyContacts = () => {
    closeMenu();
    navigation.navigate('EmergencyContactsScreen', { userId: auth.currentUser.uid });
  };

  const navigateToLocation = () => {
    closeMenu();
    navigation.navigate('EmergencyLocationsScreen');
  };

  const navigateToAlert = () => {
    closeMenu();
    navigation.navigate('BeParent', { userId: auth.currentUser.uid });
  };

  const navigateToHomePage = () => {
    closeMenu();
    if (source === 'HomePage_kids' && childData) {
      navigation.navigate('HomePage_kids', { childData });
    } else {
      navigation.navigate('HomePage');
    }
  };

  const navigateToWhatToDo = () => {
    closeMenu();
    navigation.navigate('WhatToDo', { source: 'HomePage' });
  };

  // אפקטים של אנימציות
  useEffect(() => {
    loadChatHistory();

    Animated.sequence([
      Animated.timing(translateY, {
        toValue: height * -0.85,
        duration: 1000,
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
        delay: index * 200,
        useNativeDriver: true,
      }).start();
    });

    if (messages.length === 0) {
      const welcomeMessage = {
        role: 'assistant',
        content: "שלום, אני המרחב הבטוח שלך לשיתוף ועיבוד רגשות. אני כאן כדי להקשיב, לתמוך ולעזור לך לפתח כלים להתמודדות עם אתגרים רגשיים. מה הביא אותך לשיחה היום?"
      };
      setMessages([welcomeMessage]);
      setConversationContext(prev => ({...prev, stage: 'assessment'}));
    }
  }, []);
  
  // גלילה אוטומטית למטה בכל פעם שנוספת הודעה חדשה
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current.scrollToEnd({ animated: true });
      }, 200);
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!userInput.trim()) return;
  
    // שלח את השאלה של המשתמש
    const newMessage = { role: 'user', content: userInput };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setUserInput('');
    
    setIsLoading(true);
    setError('');
    
    try {
      const API_KEY = 'AIzaSyCWGq5h3YlWOeo5cqEC9nWwnMYvZADsAhs';
      
      // בדוק אם זו הודעת חירום נפשי
      const isEmergency = isEmergencyCase(userInput);
      
      let responseContent;
      
      if (isEmergency) {
        // תשובה למקרה חירום נפשי
        responseContent = `אני מזהה שאתה חווה מצוקה משמעותית כרגע. חשוב לי שתדע שיש מקומות שיכולים לעזור לך באופן מיידי.

רופא המשפחה שלך, פסיכולוג או פסיכיאטר גם יכולים לעזור לך למצוא את הטיפול המתאים לך.

הנה כמה משאבים שיכולים לעזור לך:

* **קו החירום של ער"ן** 1201
* **חדר מיון פסיכיאטרי** בבית החולים הקרוב אליך
* **אתר משרד הבריאות בנושא בריאות הנפש** https://www.gov.il/he/departments/topics/mental_health/govil-landing-page

זכור, אתה לא לבד, יש עזרה זמינה. אם תרצה, נוכל לדבר על מה שקורה ולחשוב יחד על הצעד הבא.`;
      } else {
        // בנה הנחיות מותאמות לשלב בשיחה
        let systemInstruction = buildSystemInstruction();
        
        // שלח את השאלה ל-API
        const response = await axios.post(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, 
          {
            contents: [{
              parts: [{
                text: `${systemInstruction}

היסטוריית השיחה הקודמת:
${messages.map(msg => `${msg.role === 'user' ? 'המשתמש' : 'המטפל'}: ${msg.content}`).join('\n')}

הודעת המשתמש הנוכחית: ${userInput}`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1000
            }
          },
          {
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );
        
        responseContent = response.data.candidates[0].content.parts[0].text;
        
        // עדכן את שלב השיחה בהתאם לתוכן
        updateConversationContext(userInput, responseContent);
      }
    
      const aiMessage = {
        role: 'assistant',
        content: responseContent
      };
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages, aiMessage];
        
        // שמור את השיחה בהיסטוריה אחרי עדכון ההודעות
        setTimeout(() => saveChatToHistory(), 100);
        
        return updatedMessages;
      }); 
    } catch (error) {
      console.error('Error:', error.response?.data || error.message);
      setError('אירעה שגיאה בשליחת ההודעה. נסה שוב מאוחר יותר.');
    } finally {
      setIsLoading(false);
    }
  };
  const loadChatHistory = async () => {
    try {
      const historyData = await AsyncStorage.getItem('chatHistory');
      if (historyData) {
        setChatHistory(JSON.parse(historyData));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };
  
  // 3. פונקציה לשמירת שיחה חדשה או עדכון שיחה קיימת
  const saveChatToHistory = async () => {
    try {
      if (messages.length <= 1) return; // אל תשמור שיחות ריקות

      const timestamp = new Date().toISOString();
      let newHistory = [...chatHistory];
      
      // אם זו שיחה קיימת שנמשכת, עדכן אותה
      if (currentChatId) {
        const existingChatIndex = newHistory.findIndex(chat => chat.id === currentChatId);
        if (existingChatIndex !== -1) {
          newHistory[existingChatIndex] = {
            ...newHistory[existingChatIndex],
            messages: messages,
            lastUpdated: timestamp,
            previewText: messages[messages.length - 1].content.substring(0, 50) + '...'
          };
        }
      } else {
        // אחרת צור שיחה חדשה
        const newChatId = `chat_${timestamp}`;
        setCurrentChatId(newChatId);
        
        newHistory.unshift({
          id: newChatId,
          title: `שיחה מתאריך ${new Date().toLocaleDateString('he-IL')}`,
          messages: messages,
          created: timestamp,
          lastUpdated: timestamp,
          previewText: messages[messages.length - 1].content.substring(0, 50) + '...'
        });
      }
      
      // שמור במספר מוגבל של שיחות (לדוגמה, 10 האחרונות)
      if (newHistory.length > 10) {
        newHistory = newHistory.slice(0, 10);
      }
      
      await AsyncStorage.setItem('chatHistory', JSON.stringify(newHistory));
      setChatHistory(newHistory);
    } catch (error) {
      console.error('Error saving chat to history:', error);
    }
  };
  
  // בניית הנחיות מותאמות לשלב בשיחה
  const buildSystemInstruction = () => {
    const { stage, identifiedIssues, sessionCount } = conversationContext;
    
    let baseInstruction = `הנחיות: תענה כפסיכולוג מקצועי אמפתי עם ניסיון של 15 שנה בטיפול קוגניטיבי-התנהגותי (CBT) וטיפול ממוקד רגש (EFT). 

המטרה העיקרית שלך היא לספק למשתמש כלים מעשיים להתמודדות עם רגשות ואתגרים רגשיים, ולא רק הקשבה והכלה.

השתמש בגישה טיפולית הכוללת:
1. הקשבה אמפתית ושיקוף רגשות
2. זיהוי דפוסי חשיבה ורגשות
3. הוראה של טכניקות ספציפיות להתמודדות (למשל: נשימות מעגליות, מיינדפולנס, חשיבה מאוזנת)
4. תרגולים מעשיים לניהול רגשות ושליטה עצמית`;
    
    // התאמת ההנחיות לשלב בשיחה
    if (stage === 'assessment' || sessionCount < 2) {
      baseInstruction += `

בשלב זה של השיחה, התמקד ב:
- זיהוי הרגשות והצרכים העיקריים של המשתמש
- הבנת הקונטקסט של המצוקה
- שיקוף והקשבה אמפתית
- הצעת 1-2 טכניקות פשוטות שהמשתמש יכול ליישם מיד
- שאילת שאלות שיעזרו למשתמש להעמיק בהבנת הרגשות שלו`;
    } else if (stage === 'tools' || identifiedIssues.length > 0) {
      baseInstruction += `

בשלב זה של השיחה, התמקד ב:
- הצגת טכניקות וכלים ספציפיים להתמודדות עם ${identifiedIssues.join(', ')}
- הסבר מפורט (אך תמציתי) איך ליישם את הכלים בצורה מעשית
- טכניקות שכדאי להציע: נשימות מעגליות, הרפיית שרירים הדרגתית, חשיבה מאוזנת, מיינדפולנס, התבוננות באופן אחר על המצב
- תן הסבר בצורת צעדים או שלבים ברורים
- שאל את המשתמש אם הוא מוכן לנסות את הטכניקה עכשיו`;
    } else {
      baseInstruction += `

בתגובה זו, התמקד ב:
- סיכום קצר של הנושאים העיקריים שעלו בשיחה
- חיזוק הכלים והטכניקות שהוצעו
- הדגשת 2-3 נקודות מפתח לתרגול או יישום
- הזמנה להמשך התהליך בעתיד`;
    }
    
    baseInstruction += `

חשוב: ספק תשובות שימושיות עם כלים מעשיים ואסטרטגיות התמודדות, ולא רק תמיכה רגשית כללית. הדגש צעדים ספציפיים שהמשתמש יכול לנקוט. אורך התגובה המומלץ הוא 6-10 משפטים, מסודרים בפסקאות קצרות.`;
    
    return baseInstruction;
  };
  
  // עדכון הקונטקסט של השיחה בהתאם לתוכן
  const updateConversationContext = (userMessage, aiResponse) => {
    setConversationContext(prev => {
      const newContext = {...prev};
      
      // עדכון מונה השיחות
      newContext.sessionCount++;
      
      // זיהוי נושאים/בעיות מרכזיים
      const emotionalIssues = identifyEmotionalIssues(userMessage);
      if (emotionalIssues.length > 0 && !newContext.identifiedIssues.includes(emotionalIssues[0])) {
        newContext.identifiedIssues = [...newContext.identifiedIssues, ...emotionalIssues];
      }
      
      // זיהוי כלים שהוצעו
      const tools = identifyTherapeuticTools(aiResponse);
      if (tools.length > 0) {
        tools.forEach(tool => {
          if (!newContext.suggestedTools.includes(tool)) {
            newContext.suggestedTools.push(tool);
          }
        });
        // אם הוצעו כלים, עבור לשלב הכלים
        newContext.stage = 'tools';
      }
      
      // עדכון שלב השיחה
      if (newContext.sessionCount > 5 && newContext.suggestedTools.length >= 2) {
        newContext.stage = 'practice';
      }
      
      return newContext;
    });
  };
  
  // פונקציה לזיהוי בעיות רגשיות מתוך טקסט
  const identifyEmotionalIssues = (text) => {
    const emotionalKeywords = {
      'חרדה': ['חרדה', 'פחד', 'דאגה', 'לחץ', 'חרד', 'מתוח', 'מתח', 'פאניקה', 'התקף'],
      'דיכאון': ['דיכאון', 'עצוב', 'עצבות', 'דכדוך', 'מדוכא', 'חוסר אנרגיה', 'חוסר מוטיבציה'],
      'כעס': ['כעס', 'כועס', 'זעם', 'תסכול', 'מתוסכל', 'כעסתי', 'מרגיז'],
      'בדידות': ['בדידות', 'בודד', 'לבד', 'חוסר שייכות', 'דחוי'],
      'קשיי שינה': ['שינה', 'נדודי שינה', 'קשה להירדם', 'התעוררויות', 'עייפות'],
      'קושי בקבלת החלטות': ['החלטה', 'להחליט', 'קושי בהחלטה', 'מתלבט'],
      'מערכות יחסים': ['יחסים', 'זוגיות', 'קשר', 'חבר', 'חברה', 'משפחה', 'הורים', 'ילדים']
    };
    
    const lowerText = text.toLowerCase();
    const foundIssues = [];
    
    for (const [issue, keywords] of Object.entries(emotionalKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        foundIssues.push(issue);
      }
    }
    
    return foundIssues;
  };
  
  // פונקציה לזיהוי כלים טיפוליים שהוצעו בתשובה
  const identifyTherapeuticTools = (text) => {
    const toolKeywords = {
      'נשימות': ['נשימה', 'נשימות', 'נשום', 'נשמי', 'נשום לאט'],
      'מיינדפולנס': ['מיינדפולנס', 'קשיבות', 'מודעות', 'רגע הנוכחי', 'להיות בהווה'],
      'חשיבה מאוזנת': ['חשיבה מאוזנת', 'מחשבות אוטומטיות', 'עיוות חשיבה', 'פרשנות'],
      'הרפיה': ['הרפיה', 'הרפיית שרירים', 'הרפייה', 'שחרור מתח'],
      'יומן רגשות': ['יומן', 'רישום', 'תיעוד', 'לכתוב', 'לרשום'],
      'דמיון מודרך': ['דמיון', 'דמיון מודרך', 'דמיין', 'מקום בטוח'],
      'שיחה פנימית': ['שיחה פנימית', 'דיבור עצמי', 'מונולוג פנימי', 'דיאלוג']
    };


    
    const lowerText = text.toLowerCase();
    const foundTools = [];
    
    for (const [tool, keywords] of Object.entries(toolKeywords)) {
      if (keywords.some(keyword => lowerText.includes(keyword))) {
        foundTools.push(tool);
      }
    }
    
    return foundTools;
  };
  
  // פונקציה שבודקת אם מדובר במקרה חירום נפשי
  const isEmergencyCase = (input) => {
    const emergencyKeywords = [
      'אובדני', 'להתאבד', 'אני רוצה למות', 'לשים קץ', 'לסיים את החיים',
      'לא רוצה לחיות', 'אין לי סיבה לחיות', 'מחשבות אובדניות', 
      'רצון למות', 'לפגוע בעצמי', 'פגיעה עצמית', 'אין טעם', 'לא רוצה להמשיך'
    ];
    
    const inputLower = input.toLowerCase();
    return emergencyKeywords.some(keyword => inputLower.includes(keyword));
  };

  // 5. פונקציה לטעינת שיחה מההיסטוריה
  const loadChatFromHistory = (selectedChat) => {
    setMessages(selectedChat.messages);
    setCurrentChatId(selectedChat.id);
    setConversationContext(prev => {
      // נסה לשחזר את הקונטקסט מההיסטוריה או צור אחד חדש אם אין
      return {
        stage: 'assessment',
        identifiedIssues: [],
        suggestedTools: [],
        sessionCount: selectedChat.messages.length / 2 // הערכה גסה של מספר החילופים
      };
    });
    setHistoryModalVisible(false);
  };
  
  // 6. פונקציה ליצירת שיחה חדשה
  const startNewChat = () => {
    setMessages([{
      role: 'assistant',
      content: "שלום, אני המרחב הבטוח שלך לשיתוף ועיבוד רגשות. אני כאן כדי להקשיב, לתמוך ולעזור לך לפתח כלים להתמודדות עם אתגרים רגשיים. מה הביא אותך לשיחה היום?"
    }]);
    setCurrentChatId(null);
    setConversationContext({
      stage: 'initial',
      identifiedIssues: [],
      suggestedTools: [],
      sessionCount: 0
    });
    setHistoryModalVisible(false);
  };
  
  // 7. פונקציה למחיקת שיחה מההיסטוריה
  const deleteChatFromHistory = async (chatId) => {
    try {
      const updatedHistory = chatHistory.filter(chat => chat.id !== chatId);
      setChatHistory(updatedHistory);
      await AsyncStorage.setItem('chatHistory', JSON.stringify(updatedHistory));
      
      // אם מחקנו את השיחה הנוכחית, התחל שיחה חדשה
      if (chatId === currentChatId) {
        startNewChat();
      }
    } catch (error) {
      console.error('Error deleting chat from history:', error);
    }
  };


  return (
    <Pressable style={styles.container} onPress={closeMenuAndNotifications}>
      <ImageBackground
        source={require('../../assets/chat.png')}
        style={styles.background}
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
            <Animated.View
              style={[
                styles.halfCircle,
                {
                  transform: [{ translateY }],
                },
              ]}
            >
              <LinearGradient
                colors={['#5ce1e6', '#8c52ff', '#5ce1e6']}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.gradient, { zIndex: 0 }]}
              />
              <View style={styles.halfCircleTextContainer}>
                <Text style={styles.halfCircleText_title}>מרחב בטוח</Text>
              </View>
            </Animated.View>

            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.historyButton} 
              onPress={() => setHistoryModalVisible(true)}
            >
              <Ionicons name="time-outline" size={26} color="white" />
            </TouchableOpacity>

            {/* אזור הצ'אט */}
            <View style={styles.chatArea}>
              <ScrollView 
                style={styles.chatContainer}
                ref={scrollViewRef}
              >
                {messages.map((message, index) => (
                  <View 
                    key={index} 
                    style={[
                      styles.messageContainer,
                      message.role === 'user' ? styles.userMessageContainer : styles.aiMessageContainer
                    ]}
                  >
                    <LinearGradient
                      colors={message.role === 'user' ? ['#5ce1e6', '#8c52ff'] : ['#8c52ff', '#5ce1e6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.messageGradient}
                    >
                      <Text style={styles.messageText}>
                        {message.content}
                      </Text>
                    </LinearGradient>
                  </View>
                ))}
                {error ? (
                  <Text style={styles.errorMessage}>{error}</Text>
                ) : null}
                {isLoading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#8c52ff" />
                  </View>
                )}
              </ScrollView>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="שתף/י ברגשות ובמחשבות שלך..."
                  placeholderTextColor="#666"
                  value={userInput}
                  onChangeText={setUserInput}
                  editable={!isLoading}
                  multiline={true}
                  numberOfLines={2}
                />
                <TouchableOpacity
                  onPress={sendMessage}
                  disabled={isLoading}
                  style={styles.sendButton}
                >
                  <LinearGradient
                    colors={['#5ce1e6', '#8c52ff']}
                    style={styles.sendButtonGradient}
                  >
                    <Text style={styles.sendButtonText}>
                      {isLoading ? "..." : "שלח"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {/* פוטר עם גרדיאנט */}
            <View style={styles.footer}>
              <LinearGradient
                colors={['#5ce1e6', '#8c52ff', '#5ce1e6']}
                locations={[0, 0.7, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.footerGradient}
              >
                {(() => {
                  const buttonsToShow = source === 'HomePage_kids' 
                    ? [0, 1, 3] 
                    : [0, 1, 2, 3];
                    
                  return buttonsToShow.map((buttonIndex, animIndex) => (
                    <Animated.View
                      key={buttonIndex}
                      style={{
                        opacity: buttonAnimations[animIndex],
                        transform: [{ scale: buttonAnimations[animIndex] }],
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          if (buttonIndex === 0) {
                            navigateToHomePage();
                          } else if (buttonIndex === 1) {
                            navigateToWhatToDo();
                          } else if (buttonIndex === 2) {
                            navigation.navigate('BeParent');
                          } else {
                            toggleMenu();
                          }
                        }}
                        style={styles.footerButton}
                      >
                        <Image
                          source={
                            buttonIndex === 0
                              ? require('../../assets/house.png')
                              : buttonIndex === 1
                              ? require('../../assets/mark.png')
                              : buttonIndex === 2
                              ? require('../../assets/love-2.png')
                              : require('../../assets/menu.png')
                          }
                          style={styles.footerIcon}
                        />
                      </TouchableOpacity>
                    </Animated.View>
                  ));
                })()}
              </LinearGradient>
            </View>

            <Modal
              animationType="slide"
              transparent={true}
              visible={historyModalVisible}
              onRequestClose={() => setHistoryModalVisible(false)}
            >
              <View style={styles.modalContainer}>
                <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>היסטוריית שיחות</Text>
                  
                  <TouchableOpacity 
                    style={styles.newChatButton}
                    onPress={startNewChat}
                  >
                    <Text style={styles.newChatButtonText}>שיחה חדשה +</Text>
                  </TouchableOpacity>
                  
                  <ScrollView style={styles.historyList}>
                    {chatHistory.length === 0 ? (
                      <Text style={styles.noHistoryText}>אין שיחות קודמות</Text>
                    ) : (
                      chatHistory.map((chat) => (
                        <View key={chat.id} style={styles.historyItem}>
                          <TouchableOpacity 
                            style={styles.historyItemContent}
                            onPress={() => loadChatFromHistory(chat)}
                          >
                            <Text style={styles.historyItemTitle}>{chat.title}</Text>
                            <Text style={styles.historyItemPreview}>{chat.previewText}</Text>
                            <Text style={styles.historyItemDate}>
                              {new Date(chat.lastUpdated).toLocaleDateString('he-IL')}
                            </Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={styles.deleteButton}
                            onPress={() => deleteChatFromHistory(chat.id)}
                          >
                            <Ionicons name="trash-outline" size={20} color="#ff5555" />
                          </TouchableOpacity>
                        </View>
                      ))
                    )}
                  </ScrollView>
                  
                  <TouchableOpacity 
                    style={styles.closeButton}
                    onPress={() => setHistoryModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>סגור</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </Modal>
          </View>
        </Animated.View>

        {/* Menu and overlay */}
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
                <Text style={styles.menuProfileName}>שלום, {auth.currentUser?.displayName || 'משתמש'}!</Text>
                <Text style={styles.menuProfileSubtitle}>משתמש רשום</Text>
              </View>
              
              <View style={styles.menuContent}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={navigateToEditProfile}
                >
                  <Text style={styles.menuTextOnly}>עריכת פרופיל</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={navigateToEmergencyContacts}
                >
                  <Text style={styles.menuTextOnly}>אנשי חירום</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={navigateToLocation}
                >
                  <Text style={styles.menuTextOnly}>אזורי התראה</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={navigateToAlert}
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
      </ImageBackground>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    resizeMode: 'cover',
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 10,
    borderRadius: 20,
    padding: 8,
  },
  halfCircle: {
    position: 'absolute',
    top: 0,
    left: width / 2 - 500,
    width: 1000,
    height: 1000,
    borderRadius: 600,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
  halfCircleTextContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    zIndex: 1,
  },
  halfCircleText_title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: '#000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
    marginTop: 900,
  },
  chatArea: {
    flex: 1,
    marginTop: height * 0.25,
    marginBottom: 70,
    width: '100%',
  },
  chatContainer: {
    flex: 1,
    padding: 10,
  },
  messageContainer: {
    marginBottom: 10,
    maxWidth: '85%',
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
  },
  messageGradient: {
    padding: 10,
    borderRadius: 15,
  },
  messageText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    textAlignVertical: 'center',
    minHeight: 45,
  },
  sendButton: {
    width: 60,
    height: 45,
    overflow: 'hidden',
    borderRadius: 20,
  },
  sendButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
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
    flexDirection: 'row',
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
  loadingContainer: {
    padding: 10,
    alignItems: 'center',
  },
  errorMessage: {
    color: '#ff0000',
    textAlign: 'center',
    padding: 10,
  },
  historyButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    padding: 8,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#8c52ff',
  },
  historyList: {
    width: '100%',
    marginVertical: 10,
  },
  historyItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  historyItemContent: {
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  historyItemPreview: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  historyItemDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  deleteButton: {
    padding: 10,
  },
  noHistoryText: {
    textAlign: 'center',
    padding: 20,
    color: '#666',
  },
  newChatButton: {
    backgroundColor: '#8c52ff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginBottom: 10,
    width: '100%',
  },
  newChatButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  closeButtonText: {
    textAlign: 'center',
    color: '#333',
    fontSize: 16,
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
  mainContentContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
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
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    backgroundColor: '#6eacf0',
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
  menuTextOnly: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c6975',
    textAlign: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 10,
    marginHorizontal: 20,
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

export default Chat_AI;
