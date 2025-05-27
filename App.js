import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet, ScrollView, I18nManager } from 'react-native';
import { initializeApp } from '@firebase/app';
import { getAuth, onAuthStateChanged, signOut } from '@firebase/auth';
import { getFirestore } from '@firebase/firestore';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import AlertNotifications from './src/screens/components/AlertNotifications.js';

import LoginScreen from './src/screens/LoginScreen';
import SignUpScreen from './src/screens/SignUpScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import Homepage from './src/screens/HomePage';
import Homepage_organ from './src/screens/HomePage_Organ';
import ShelterMap from './src/screens/ShelterMap';
import Editprofile_organ from './src/screens/EditProfile_organ';
import EditProfile_general from './src/screens/EditProfile_general';
import AddVolunteering from './src/screens/AddVolunteering';
import UserVolunteering from './src/screens/UserVolunteerings';
import AllVolunteering from './src/screens/AllVolunteerings';
import LikedVolunteering from './src/screens/LikedVolunteerings';
import EditVolunteering from './src/screens/EditVolunteering';
import WhatToDo from './src/screens/WhatToDo';
import Chat_AI from './src/screens/Chat_AI.js';
import Kids_zone from './src/screens/Kids_zone.js';
import AlertPage from './src/screens/AlertPage.js';
import BeParent from './src/screens/BeParent.js';
import VolunteerProfileScreen from './src/screens/VolunteerProfileScreen.js';
import VolunteersListScreen from './src/screens/VolunteersListScreen.js';
import VolunteerDetailsScreen from './src/screens/VolunteerDetailsScreen.js';
import ChatScreen from './src/screens/ChatScreen.js';
import ChildProfilesScreen from './src/screens/ChildProfilesScreen.js';
import HomePage_kids from './src/screens/HomePage_kids.js';
import EmergencyContactsScreen from './src/screens/EmergencyContactsScreen.js';
import EmergencyLocationsScreen from './src/screens/EmergencyLocationsScreen.js';
import ChatListScreen from './src/screens/ChatListScreen.js';
import VolunteeringDetailes from './src/screens/VolunteeringDetailes.js';
import OrganVoluDetails from './src/screens/OrganVoluDetails.js';
import VolunteeringRequests from './src/screens/VolunteeringRequests.js';
import EditVolunteerProfile from './src/screens/EditVolunteerProfile.js';
import VolunteeringStats from './src/screens/VolunteeringStats';
import ChatAI_kids from './src/screens/ChatAI_kids';

// Configure RTL
I18nManager.allowRTL(true);
I18nManager.forceRTL(false); // Let the device settings determine RTL

const firebaseConfig = {
  apiKey: "AIzaSyAHSaADPY5CgOuVraCQ8DKrQrIsrTMonmA",
  authDomain: "safezonefinal.firebaseapp.com",
  projectId: "safezonefinal",
  storageBucket: "safezonefinal.firebasestorage.app",
  messagingSenderId: "705042810802",
  appId: "1:705042810802:web:a9338026ac395ac5efc6ab",
  measurementId: "G-NWFCN00D80"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const Stack = createStackNavigator();

const App = () => {
  const [user, setUser] = useState(null);

  // useEffect to subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user); // Update user state when auth state changes
    });

    // Cleanup subscription when component unmounts
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth); // Log the user out
      console.log('User logged out successfully!');
    } catch (error) {
      console.error('Logout error:', error.message);
    }
  };

  return (
    <NavigationContainer>
      <AlertNotifications auth={auth} db={db} />
      <Stack.Navigator
        initialRouteName={user ? 'HomePage_organ' : 'Login'}
        screenOptions={{
          headerShown: false,
          ...TransitionPresets.FadeFromBottomAndroid,
          gestureEnabled: false
        }}
      >
        {/* Home Screen */}
        <Stack.Screen name="HomePage">
          {(props) => <Homepage {...props} user={user} handleLogout={handleLogout} />}
        </Stack.Screen>

        <Stack.Screen name="HomePage_organ">
          {(props) => <Homepage_organ {...props} user={user} handleLogout={handleLogout} />}
        </Stack.Screen>

        {/* ShelterMap Screen */}
        <Stack.Screen name="ShelterMap" component={ShelterMap} />

         <Stack.Screen name="EditProfile_organ" component={Editprofile_organ} />

         <Stack.Screen name="EditProfile_general" component={EditProfile_general} />

         <Stack.Screen name="AddVolunteering" component={AddVolunteering} />

         <Stack.Screen name="UserVolunteering" component={UserVolunteering} />

         <Stack.Screen name="AllVolunteering" component={AllVolunteering} />

         <Stack.Screen name="LikedVolunteering" component={LikedVolunteering} />

         <Stack.Screen name="EditVolunteering" component={EditVolunteering} />


         <Stack.Screen name="WhatToDo" component={WhatToDo} />

         <Stack.Screen name="Chat_AI" component={Chat_AI} />

         <Stack.Screen name="Kids_zone" component={Kids_zone} />

         <Stack.Screen name="AlertPage" component={AlertPage} />

         <Stack.Screen name="BeParent" component={BeParent} />

         <Stack.Screen name="VolunteerProfileScreen" component={VolunteerProfileScreen} />

         <Stack.Screen name="VolunteersListScreen" component={VolunteersListScreen} />

         <Stack.Screen name="VolunteerDetailsScreen" component={VolunteerDetailsScreen} />

         <Stack.Screen name="ChildProfilesScreen" component={ChildProfilesScreen} />

         <Stack.Screen name="HomePage_kids" component={HomePage_kids} />

         <Stack.Screen name="ChatScreen" component={ChatScreen} options={{ headerShown: false }} />

         <Stack.Screen name="EmergencyContactsScreen" component={EmergencyContactsScreen} />

         <Stack.Screen name="EmergencyLocationsScreen" component={EmergencyLocationsScreen} />

         <Stack.Screen name="ChatListScreen" component={ChatListScreen} />

         <Stack.Screen name="VolunteeringDetailes" component={VolunteeringDetailes} />

         <Stack.Screen name="OrganVoluDetails" component={OrganVoluDetails} />

         <Stack.Screen name="VolunteeringRequests" component={VolunteeringRequests} />

         <Stack.Screen name="EditVolunteerProfile" component={EditVolunteerProfile} />

         <Stack.Screen name="ChatAI_kids" component={ChatAI_kids} />

         <Stack.Screen 
  name="VolunteeringStats" 
  component={VolunteeringStats} 
  options={{ headerShown: false }}
/>

        {/* Login Screen */}
        <Stack.Screen name="Login">
          {(props) => (
            <LoginScreen
              auth={auth}
              setUser={setUser}
              navigation={props.navigation} // Pass navigation prop
            />
          )}
        </Stack.Screen>

        {/* SignUp Screen */}
        <Stack.Screen name="SignUp">
          {(props) => (
            <SignUpScreen
              auth={auth}
              db={db}
              navigation={props.navigation} // Pass navigation prop
            />
          )}
        </Stack.Screen>

        {/* ForgotPassword Screen */}
        <Stack.Screen name="ForgotPassword">
          {(props) => (
            <ForgotPasswordScreen
              auth={auth}
              navigation={props.navigation} // Pass navigation prop
            />
          )}
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 0, // Remove unnecessary padding
    margin: 0, // Remove unnecessary margin
    backgroundColor: '#f0f0f0', // Background color
  },
});

export default App;