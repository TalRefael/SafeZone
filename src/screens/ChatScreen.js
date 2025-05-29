// screens/ChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet, TouchableOpacity,
  KeyboardAvoidingView, Platform, ImageBackground, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { 
  collection, addDoc, query, where, orderBy, onSnapshot, 
  serverTimestamp, getFirestore, doc, updateDoc, getDocs, writeBatch
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const ChatScreen = ({ route, navigation }) => {
  const { volunteerId, volunteerName, currentUserId } = route.params;
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const flatListRef = useRef();
  const db = getFirestore();
  const auth = getAuth();
  const currentUser = auth.currentUser;

  // החלפה: נעדיף להשתמש ב-currentUser.uid במקום currentUserId
  const actualCurrentUserId = currentUserId || currentUser?.uid;

  // בדיקה שהמשתמש מחובר ויש לו מזהה
  useEffect(() => {
    if (!actualCurrentUserId) {
      Alert.alert('שגיאה', 'לא ניתן לזהות את המשתמש. אנא התחבר מחדש.');
      navigation.goBack();
      return;
    }
  }, [actualCurrentUserId, navigation]);

  // יצירת מזהה ייחודי לצ'אט בין המשתמש הנוכחי למתנדב
  const chatId = actualCurrentUserId && volunteerId ? [actualCurrentUserId, volunteerId].sort().join('_') : '';

  useEffect(() => {
    if (!actualCurrentUserId || !chatId) return;

    // האזנה להודעות חדשות בצ'אט הספציפי
    const messagesRef = collection(db, 'chatMessages');
    const q = query(
      messagesRef,
      where('chatId', '==', chatId),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(messageList);
      
      // סימון הודעות כנקראות
      markMessagesAsRead();
    });

    // ניקוי ההאזנה כשהמסך נסגר
    return () => unsubscribe();
  }, [chatId, db, actualCurrentUserId]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    
    // בדיקה נוספת לפני שליחה
    if (!actualCurrentUserId) {
      Alert.alert('שגיאה', 'לא ניתן לזהות את המשתמש');
      return;
    }

    if (!volunteerId) {
      Alert.alert('שגיאה', 'לא ניתן לזהות את המתנדב');
      return;
    }

    try {
      const messagesRef = collection(db, 'chatMessages');
      await addDoc(messagesRef, {
        chatId,
        text: message.trim(),
        senderId: actualCurrentUserId, // שימוש ב-actualCurrentUserId
        receiverId: volunteerId,
        timestamp: serverTimestamp(),
        read: false
      });

      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('שגיאה', 'לא ניתן לשלוח את ההודעה: ' + error.message);
    }
  };

  const markMessagesAsRead = async () => {
    if (!actualCurrentUserId) return;
    
    try {
      const messagesRef = collection(db, 'chatMessages');
      const q = query(
        messagesRef,
        where('chatId', '==', chatId),
        where('receiverId', '==', actualCurrentUserId),
        where('read', '==', false)
      );

      const querySnapshot = await getDocs(q);
      const batch = writeBatch(db);

      querySnapshot.forEach((doc) => {
        batch.update(doc.ref, { read: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const renderMessage = ({ item }) => {
    const isMine = item.senderId === actualCurrentUserId;
    
    return (
      <View style={[
        styles.messageContainer,
        isMine ? styles.myMessage : styles.theirMessage
      ]}>
        <Text style={styles.messageText}>{item.text}</Text>
        <Text style={styles.timestampText}>
          {item.timestamp ? new Date(item.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </Text>
      </View>
    );
  };

  // אם אין מזהה משתמש, הצג הודעת טעינה
  if (!actualCurrentUserId) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>טוען...</Text>
      </View>
    );
  }

  return (
    <ImageBackground
      source={require('../../assets/start.png')}
      style={styles.backgroundImage}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.title}>{volunteerName}</Text>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={100}
          style={styles.inputContainer}
        >
          <TextInput
            style={styles.input}
            placeholder="הקלד הודעה..."
            value={message}
            onChangeText={setMessage}
            multiline
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              (!message.trim() || !actualCurrentUserId) && styles.sendButtonDisabled
            ]} 
            onPress={sendMessage}
            disabled={!message.trim() || !actualCurrentUserId}
          >
            <Ionicons name="send" size={24} color="white" />
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    padding: 16,
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
    left: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  messagesList: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
  },
  messagesContainer: {
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 5,
    padding: 10,
    borderRadius: 15,
  },
  myMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCF8C6',
    borderTopLeftRadius: 5,
  },
  theirMessage: {
    alignSelf: 'flex-end',
    backgroundColor: 'white',
    borderTopRightRadius: 5,
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  timestampText: {
    fontSize: 10,
    color: '#999',
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 25,
    marginTop: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 12,
    fontSize: 16,
    marginRight: 10,
    textAlign: 'right',
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
});

export default ChatScreen;