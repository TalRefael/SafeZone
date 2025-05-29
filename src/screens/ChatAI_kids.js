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
  Modal,
  FlatList,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LottieView from 'lottie-react-native';
const { width, height } = Dimensions.get('window');

const ChatAI_kids = ({ navigation, route }) => {
  const { childData } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [conversationContext, setConversationContext] = useState({
    stage: 'initial', // initial, assessment, tools, practice, followup
    identifiedIssues: [],
    suggestedTools: [],
    sessionCount: 0,
    childName: childData?.name || 'חבר/ה'
  });
  const scrollViewRef = useRef();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Add animation refs for menu
  const slideAnim = useRef(new Animated.Value(280)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const mainContentScale = useRef(new Animated.Value(1)).current;
  const mainContentTranslate = useRef(new Animated.Value(0)).current;

  // Add animation refs for footer
  const footerAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;

  const navigateToWhatToDo = () => navigation.navigate('WhatToDo');

  // אנימציה לעיגול
  const translateY = useRef(new Animated.Value(-800)).current;
  const circleScale = useRef(new Animated.Value(0.8)).current;
  
  const navigateToHomePage = () => {
    // חזור לדף הילדים עם נתוני הילד
    navigation.navigate('HomePage_kids', { childData });
  };
  
  // אנימציות לכפתורים בפוטר
  const buttonAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ]).current;

  // אפקטים של אנימציות
  useEffect(() => {
    // עיגול יורד למרכז עם אנימציה משופרת
    loadChatHistory();

    Animated.sequence([
      Animated.timing(translateY, {
        toValue: height * -0.85,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(circleScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();

    // כפתורים בפוטר מופיעים אחד אחרי השני עם אפקט קפיצה
    buttonAnimations.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        delay: index * 200,
        useNativeDriver: true,
      }).start();
    });
    
    // אם אין עדיין הודעות, הוסף הודעת פתיחה מהמערכת
    if (messages.length === 0) {
      const childName = conversationContext.childName;
      const welcomeMessage = {
        role: 'assistant',
        content: `שלום ${childName}! אני החבר הדיגיטלי שלך, ואני כאן כדי לדבר איתך ולעזור לך. אפשר לספר לי איך אתה מרגיש היום, או על דברים שמשמחים אותך או מדאיגים אותך. אני תמיד כאן בשבילך! 😊`
      };
      setMessages([welcomeMessage]);
      
      // עדכן את שלב השיחה
      setConversationContext(prev => ({...prev, stage: 'assessment'}));
    }
  }, []);
  
  useEffect(() => {
    // Animate footer buttons
    footerAnimations.forEach((anim, index) => {
      Animated.spring(anim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        delay: index * 200,
        useNativeDriver: true,
      }).start();
    });
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
      
      // בניית הנחיות מותאמות לשלב בשיחה
      let systemInstruction = buildSystemInstruction();
      
      // שלח את השאלה ל-API
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`, 
        {
          contents: [{
            parts: [{
              text: `${systemInstruction}

היסטוריית השיחה הקודמת:
${messages.map(msg => `${msg.role === 'user' ? 'הילד/ה' : 'החבר הדיגיטלי'}: ${msg.content}`).join('\n')}

הודעת הילד/ה הנוכחית: ${userInput}`
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
      
      const responseContent = response.data.candidates[0].content.parts[0].text;
      
      // עדכן את שלב השיחה בהתאם לתוכן
      updateConversationContext(userInput, responseContent);
    
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
      setError('אופס, משהו השתבש. בוא ננסה שוב עוד רגע!');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadChatHistory = async () => {
    try {
      const historyData = await AsyncStorage.getItem('chatHistoryKids');
      if (historyData) {
        setChatHistory(JSON.parse(historyData));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };
  
  // פונקציה לשמירת שיחה חדשה או עדכון שיחה קיימת
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
        const newChatId = `chat_kids_${timestamp}`;
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
      
      await AsyncStorage.setItem('chatHistoryKids', JSON.stringify(newHistory));
      setChatHistory(newHistory);
    } catch (error) {
      console.error('Error saving chat to history:', error);
    }
  };
  
  // בניית הנחיות מותאמות לשלב בשיחה ולילדים
  const buildSystemInstruction = () => {
    const { stage, identifiedIssues, sessionCount, childName } = conversationContext;
    
    let baseInstruction = `הנחיות: ענה כחבר דיגיטלי לילדים בזמן מלחמה. אתה מדבר עם ילד/ה בשם ${childName}.

המטרה העיקרית שלך היא לספק תמיכה רגשית לילדים בזמן חירום ומלחמה, להפחית חרדות ופחדים, ולהציע רעיונות להסחת דעת ופעילויות מרגיעות.

כללים חשובים:
1. השתמש בשפה פשוטה וידידותית, מותאמת לילדים בגיל 6-12
2. שלב אימוג'ים בתשובות שלך 😊 לחיבור טוב יותר
3. הימנע מלהעלות פרטים מפחידים או מדאיגים על המלחמה
4. אל תשתמש במילים מורכבות או מקצועיות
5. תן עצות פשוטות וברורות שילדים יכולים ליישם באופן עצמאי
6. הזכר לילדים לדבר עם מבוגר שהם סומכים עליו כשהם מרגישים מפחדים או עצובים
7. הציע פעילויות מהנות להסחת דעת והפגת מתח
8. תמיד הראה אמפתיה ותמיכה בתגובותיך`;
    
    // התאמת ההנחיות לשלב בשיחה
    if (stage === 'assessment' || sessionCount < 2) {
      baseInstruction += `

בשלב זה של השיחה, התמקד ב:
- הבעת אמפתיה והבנה לרגשות של הילד/ה
- שאילת שאלות פשוטות לעודד אותם לחלוק את הרגשות שלהם
- תן משוב מרגיע ומעודד
- ספק טכניקה פשוטה אחת (כמו נשימות עמוקות או דמיון חיובי) שהילד/ה יכול/ה לנסות`;
    } else if (stage === 'tools' || identifiedIssues.length > 0) {
      baseInstruction += `

בשלב זה של השיחה, התמקד ב:
- הצעת טכניקות התמודדות פשוטות וידידותיות לילדים
- רעיונות מעשיים לפעילויות שילדים יכולים לעשות כשהם מרגישים פחד או חרדה (לצייר, לשחק, לדבר עם חבר, לשמוע מוזיקה)
- תרגילי נשימה פשוטים או דמיון חיובי מותאמים לילדים
- עידוד הילד/ה לבטא רגשות דרך אמנות, משחק או כתיבה`;
    } else {
      baseInstruction += `

בתגובה זו, התמקד ב:
- חיזוק ועידוד הילד/ה על השיתוף והשיחה
- הזכרת דבר טוב אחד או שניים מהשיחה
- הצעת רעיון פשוט או פעילות שהילד/ה יכול/ה לעשות אחרי השיחה
- הזכרת שאתה תמיד כאן בשבילם`;
    }
    
    baseInstruction += `

ענה בצורה קצרה, פשוטה וידידותית. השתמש במשפטים קצרים ופסקאות קצרות (3-4 משפטים לכל היותר בכל פסקה). השתמש באימוג'ים מתאימים כדי להמחיש ולהעביר רגשות חיוביים. 😊`;
    
    return baseInstruction;
  };
  
  // עדכון הקונטקסט של השיחה בהתאם לתוכן
  const updateConversationContext = (userMessage, aiResponse) => {
    setConversationContext(prev => {
      const newContext = {...prev};
      
      // עדכון מונה השיחות
      newContext.sessionCount++;
      
      // זיהוי נושאים/בעיות מרכזיים
      const emotionalIssues = identifyChildEmotionalIssues(userMessage);
      if (emotionalIssues.length > 0 && !newContext.identifiedIssues.includes(emotionalIssues[0])) {
        newContext.identifiedIssues = [...newContext.identifiedIssues, ...emotionalIssues];
      }
      
      // זיהוי כלים שהוצעו
      const tools = identifyChildTherapeuticTools(aiResponse);
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
  
  // פונקציה לזיהוי בעיות רגשיות של ילדים מתוך טקסט
  const identifyChildEmotionalIssues = (text) => {
    const emotionalKeywords = {
      'פחד': ['פחד', 'מפחד', 'מפחדת', 'מפחיד', 'מפחידה', 'דאגה', 'דואג', 'דואגת'],
      'עצב': ['עצוב', 'עצובה', 'בוכה', 'דמעות', 'בכי', 'עצבות'],
      'חרדה': ['חרדה', 'לחוץ', 'לחוצה', 'מתוח', 'מתוחה', 'דפיקות לב'],
      'בדידות': ['בודד', 'בודדה', 'לבד', 'בדידות', 'חברים', 'געגוע', 'מתגעגע', 'מתגעגעת'],
      'כעס': ['כעס', 'כועס', 'כועסת', 'עצבני', 'עצבנית', 'רוגז', 'רוגזת'],
      'קשיי שינה': ['שינה', 'חלום', 'חלומות רעים', 'סיוט', 'לא נרדם', 'לא נרדמת', 'להירדם'],
      'שעמום': ['משעמם', 'משועמם', 'משועממת', 'שעמום']
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
  
  // פונקציה לזיהוי כלים טיפוליים לילדים שהוצעו בתשובה
  const identifyChildTherapeuticTools = (text) => {
    const toolKeywords = {
      'נשימות': ['נשימה', 'נשימות', 'לנשום', 'תנשום', 'תנשמי'],
      'דמיון': ['דמיון', 'לדמיין', 'תדמיין', 'תדמייני', 'מקום מיוחד', 'מקום בטוח'],
      'יצירה': ['לצייר', 'ציור', 'לכתוב', 'יצירה', 'אמנות', 'צבעים'],
      'משחק': ['משחק', 'לשחק', 'תשחק', 'תשחקי', 'צעצועים'],
      'שיתוף': ['לדבר עם', 'לספר ל', 'שיתוף', 'לשתף', 'לשוחח'],
      'תנועה': ['תנועה', 'לזוז', 'לרקוד', 'ריקוד', 'ספורט', 'להתעמל'],
      'מוזיקה': ['מוזיקה', 'שיר', 'שירים', 'לשמוע', 'להקשיב']
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
  
  // פונקציה לטעינת שיחה מההיסטוריה
  const loadChatFromHistory = (selectedChat) => {
    setMessages(selectedChat.messages);
    setCurrentChatId(selectedChat.id);
    setConversationContext(prev => {
      // נסה לשחזר את הקונטקסט מההיסטוריה או צור אחד חדש אם אין
      return {
        ...prev,
        stage: 'assessment',
        identifiedIssues: [],
        suggestedTools: [],
        sessionCount: selectedChat.messages.length / 2 // הערכה גסה של מספר החילופים
      };
    });
    setHistoryModalVisible(false);
  };
  
  // פונקציה ליצירת שיחה חדשה
  const startNewChat = () => {
    const childName = conversationContext.childName;
    setMessages([{
      role: 'assistant',
      content: `שלום ${childName}! אני החבר הדיגיטלי שלך, ואני כאן כדי לדבר איתך ולעזור לך. אפשר לספר לי איך אתה מרגיש היום, או על דברים שמשמחים אותך או מדאיגים אותך. אני תמיד כאן בשבילך! 😊`
    }]);
    setCurrentChatId(null);
    setConversationContext(prev => ({
      ...prev,
      stage: 'initial',
      identifiedIssues: [],
      suggestedTools: [],
      sessionCount: 0
    }));
    setHistoryModalVisible(false);
  };
  
  // פונקציה למחיקת שיחה מההיסטוריה
  const deleteChatFromHistory = async (chatId) => {
    try {
      const updatedHistory = chatHistory.filter(chat => chat.id !== chatId);
      setChatHistory(updatedHistory);
      await AsyncStorage.setItem('chatHistoryKids', JSON.stringify(updatedHistory));
      
      // אם מחקנו את השיחה הנוכחית, התחל שיחה חדשה
      if (chatId === currentChatId) {
        startNewChat();
      }
    } catch (error) {
      console.error('Error deleting chat from history:', error);
    }
  };
  
  // פונקציה לדילוג על שורה בתצוגת תאריך
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // פונקציה להוספת אימוג'י להודעה
  const insertEmoji = (emoji) => {
    setUserInput(prev => prev + emoji);
  };
  
  // אמוג'ים פופולריים לילדים
  const popularEmojis = ['😊', '😃', '🤗', '👍', '❤️', '🌈', '🎮', '🎨', '🎵', '🐶', '🐱', '🦁', '🦄', '🌟', '🎁'];

  const navigateToChatList = () => navigation.navigate('ChatListScreen', { 
    childData: childData,
    isChildUser: true 
  });

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

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigation.replace('Login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <Pressable style={styles.container} onPress={closeMenu}>
      <ImageBackground
        source={require('../../assets/kids.png')}
        style={styles.background}
        imageStyle={{ opacity: 0.3 }}
      >
        {/* Wrap main content in Animated.View */}
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
            {/* חצי עיגול עם גרדיאנט */}
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
              
            {/* הוספת כפתור היסטוריה */}
            <TouchableOpacity 
              style={styles.historyButton} 
              onPress={() => setHistoryModalVisible(true)}
            >
              <LinearGradient
                colors={['#ff78a8', '#ffdb8b']}
                style={styles.historyButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="time-outline" size={26} color="white" />
              </LinearGradient>
            </TouchableOpacity>
            
            <Animated.View
              style={[
                styles.halfCircle,
                {
                  transform: [
                    { translateY },
                    { scale: circleScale }
                  ],
                },
              ]}
            >

              <LinearGradient
                colors={['#FF9CC0', '#FFDB8B', '#FF78A8']} // צבעי ורוד וצהוב
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.gradient, { zIndex: 0 }]}
              />
              <View style={styles.halfCircleTextContainer}>
                <Image 
                  //source={require('../../assets/smiley.png')} // תוסיף תמונה של פרצוף מחייך
                  style={styles.smileyIcon}
                />
              </View>
            </Animated.View>

          
            {/* אזור הצ'אט */}
            <View style={styles.chatArea}>
              <ScrollView 
                style={styles.chatContainer}
                ref={scrollViewRef}
                contentContainerStyle={styles.chatContentContainer}
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
                      colors={message.role === 'user' ? ['#FF78A8', '#FF9CC0'] : ['#FFDB8B', '#FFB443']} // ורוד למשתמש, צהוב/כתום לבוט
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[
                        styles.messageGradient,
                        message.role === 'user' ? styles.userMessageGradient : styles.aiMessageGradient
                      ]}
                    >
                      <Text style={styles.messageText}>
                        {message.content}
                      </Text>
                    </LinearGradient>
                    {message.role === 'assistant' && (
                      <Image 
                        //source={require('../../assets/robot.png')} // תוסיף אייקון של רובוט חמוד
                        style={styles.avatarIcon}
                      />
                    )}
                  </View>
                ))}
                {error ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorMessage}>{error}</Text>
                  </View>
                ) : null}
                {isLoading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#FF78A8" />
                    <Text style={styles.loadingText}>חושב...</Text>
                  </View>
                )}
              </ScrollView>

              {/* בחירת אימוג'י */}
              {showEmojiPicker && (
                <View style={styles.emojiPickerContainer}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.emojiRow}
                  >
                    {popularEmojis.map((emoji, index) => (
                      <TouchableOpacity 
                        key={index} 
                        style={styles.emojiButton}
                        onPress={() => insertEmoji(emoji)}
                      >
                        <Text style={styles.emojiText}>{emoji}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.inputContainer}>
                <TouchableOpacity
                  style={styles.emojiPickerButton}
                  onPress={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  <Ionicons name="happy-outline" size={24} color="#FF78A8" />
                </TouchableOpacity>
                <TextInput
                  style={styles.input}
                  placeholder="ספר/י לי מה את/ה מרגיש/ה..."
                  placeholderTextColor="#999"
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
                    colors={['#FF78A8', '#FFDB8B']} // ורוד וצהוב
                    style={styles.sendButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons name="paper-plane" size={22} color="white" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
                 {/* לוטי: אנימציה בחלק התחתון בצד */}
                 <LottieView
              source={require('../../assets/animations/robot2.json')} // הנתיב לאנימציה
              autoPlay
              loop
              style={styles.lottie}
            />
          </View>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <LinearGradient
            colors={['#FFDB8B', '#FF78A8', '#FFDB8B']}
            locations={[0, 0.5, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.footerGradient}
          >
            {[0, 1, 2, 3].map((index) => (
              <Animated.View
                key={index}
                style={{
                  opacity: footerAnimations[index],
                  transform: [
                    { scale: footerAnimations[index] },
                    { translateY: footerAnimations[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0]
                    })}
                  ],
                }}
              >
                <TouchableOpacity 
                  onPress={() => {
                    if (index === 0) navigateToHomePage();
                    else if (index === 1) navigateToWhatToDo();
                    else if (index === 2) navigateToChatList();
                    else if (index === 3) toggleMenu();
                  }}
                >
                  <Image
                    source={
                      index === 0 ? require('../../assets/house.png') :
                      index === 1 ? require('../../assets/mark.png') :
                      index === 2 ? require('../../assets/love-2.png') :
                      require('../../assets/menu.png')
                    }
                    style={styles.footerIcon}
                  />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </LinearGradient>
        </View>

        {/* מודאל היסטוריית שיחות */}
        <Modal
          visible={historyModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setHistoryModalVisible(false)}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>היסטוריית שיחות</Text>

              <TouchableOpacity
                style={styles.newChatButton}
                onPress={startNewChat}
              >
                <LinearGradient
                  colors={['#FF78A8', '#FFDB8B']}
                  style={{
                    flex: 1,
                    borderRadius: 15,
                    padding: 10,
                  }}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.newChatButtonText}>התחל שיחה חדשה</Text>
                </LinearGradient>
              </TouchableOpacity>

              {chatHistory.length > 0 ? (
                <FlatList
                  data={chatHistory}
                  style={styles.historyList}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.historyItem}
                      onPress={() => loadChatFromHistory(item)}
                    >
                      <View style={styles.historyItemContent}>
                        <Text style={styles.historyItemTitle}>{item.title}</Text>
                        <Text style={styles.historyItemPreview}>{item.previewText}</Text>
                        <Text style={styles.historyItemDate}>{formatDate(item.lastUpdated)}</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteChatFromHistory(item.id)}
                      >
                        <Ionicons name="trash-outline" size={24} color="#FF78A8" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  )}
                />
              ) : (
                <Text style={styles.noHistoryText}>אין עדיין שיחות בהיסטוריה</Text>
              )}

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setHistoryModalVisible(false)}
              >
                <Text style={styles.closeButtonText}>סגור</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ImageBackground>

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
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.menuProfile}>
              <Image
                source={childData?.gender === 'זכר' ? require('../../assets/men.png') : require('../../assets/women.png')}
                style={styles.menuProfileImage}
              />
              <Text style={styles.menuProfileName}>שלום, {childData?.name || 'חבר/ה'}!</Text>
              <Text style={styles.menuProfileSubtitle}>משתמש ילד</Text>
            </View>
            
            <View style={styles.menuContent}>
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
    </Pressable>
  );
};

// מיזוג סגנונות הנוספים ותיקון הכפילויות
const styles = StyleSheet.create({
    // סגנונות מתוקנים לאנימציות
    background: {
      flex: 1,
      resizeMode: 'cover',
      //opacity: 0.7, // הוספת שקיפות קלה לשיפור הנראות
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
      height: 1100,
      borderRadius: 600,
      overflow: 'hidden',
      zIndex: 1, // הוספת zIndex
    },
    gradient: {
      flex: 1,
    },
    lottie: {
        position: 'absolute',
        top: 70, // מיקום בחלק העליון של המסך (מתחת למקום של חזרה והיסטוריה)
        alignSelf: 'center', // מרכוז אופקי
        width: width * 0.7, // גודל מתאים יותר לחלק העליון
        height: height * 0.25, // גובה מתאים שלא יתפוס יותר מדי מקום
        zIndex: 3, // שים לב: זה צריך להיות גבוה מספיק להיראות מעל חלק מהרכיבים אבל נמוך מהצ'אט
        pointerEvents: 'none', // חשוב - כדי שהאנימציה לא תחסום אינטראקציה
      },
    halfCircleTextContainer: {
      position: 'absolute',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
      zIndex: 2, // גבוה יותר מהעיגול עצמו
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
    
    // תיקון סגנונות האייקונים
    smileyIcon: {
      width: 60,
      height: 60,
      marginTop: 5,
      zIndex: 3,
    },
    avatarIcon: {
      width: 30,
      height: 30,
      marginRight: 5,
      marginTop: 5,
    },
    
 // תיקון לאזור הצ'אט
chatArea: {
    flex: 1,
    marginTop: height * 0.25,
    marginBottom: 70,
    width: '100%', // וודא שזה תמיד 100%
    alignSelf: 'center', // להבטיח מרכוז
    zIndex: 5,
  },
      
// תיקון למיכל ההודעות
chatContainer: {
    flex: 1,
    padding: 10,
    width: '100%', // הוסף הגדרת רוחב ברורה
  },
  // תיקון לתוכן הצ'אט
chatContentContainer: {
    paddingBottom: 20,
    width: '100%', // הוסף הגדרת רוחב ברורה
    alignItems: 'stretch', // מתח אלמנטים לרוחב מלא
  },
    messageContainer: {
      marginBottom: 10,
      maxWidth: '85%',
      width: 'auto', // במקום רוחב קבוע
      alignSelf: 'flex-start', // ברירת מחדל לאלמנטים
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
    userMessageGradient: {
      borderTopRightRadius: 5,
    },
    aiMessageGradient: {
      borderTopLeftRadius: 5,
    },
    messageText: {
      color: '#ffffff',
      fontSize: 16,
      lineHeight: 22,
    },
    
// וודא שהאינפוט גם מעל
inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    zIndex: 5, // גבוה יותר מהצ'אט
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
    
   // הבטחה שאזור האימוג'ים מעל הרקע
emojiPickerContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 5,
    zIndex: 6, // הגדלה מ-4 ל-6
  },
    emojiRow: {
      flexDirection: 'row',
      paddingHorizontal: 5,
    },
    emojiButton: {
      padding: 8,
      marginHorizontal: 3,
    },
    emojiText: {
      fontSize: 24,
    },
    emojiPickerButton: {
      padding: 10,
      marginRight: 5,
    },
    
    // פוטר ומדיניות
    footer: {
      width: '100%',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 5,
    },
    footerGradient: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingHorizontal: 30,
      paddingVertical: 15,
      width: '100%',
    },
    footerIcon: {
      width: 30,
      height: 30,
    },
    
    // סגנונות להודעות שגיאה וטעינה
    loadingContainer: {
      padding: 10,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 5,
      color: '#FF78A8',
      fontWeight: 'bold',
    },
    errorContainer: {
      padding: 10,
      backgroundColor: '#ffeeee',
      borderRadius: 10,
      marginVertical: 5,
      borderWidth: 1,
      borderColor: '#ffcccc',
    },
    errorMessage: {
      color: '#ff0000',
      textAlign: 'center',
      padding: 10,
    },
    
    // כפתור היסטוריה
    historyButton: {
      position: 'absolute',
      top: 60,
      right: 20,
      zIndex: 10,
      backgroundColor: 'rgba(255,255,255,0.7)',
      borderRadius: 20,
      padding: 8,
    },
    historyButtonGradient: {
      borderRadius: 20,
      padding: 10,
      width: 46,
      height: 46,
      justifyContent: 'center',
      alignItems: 'center',
    },
    
    // סגנונות למודאל היסטוריה
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
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButtonText: {
      textAlign: 'center',
      color: '#333',
      fontSize: 16,
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
      paxddingTop: 60,
      paddingBottom: 20,
      backgroundColor: '#ff9c9e',
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

export default ChatAI_kids;
