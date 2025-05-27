import React, { useState } from 'react';
import {
TouchableOpacity,
Text,
StyleSheet,
ActivityIndicator,
Alert,
Animated,
Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
const SafeButton = ({ onPress, disabled, loading, text = "אני בטוח" }) => {
const [scaleValue] = useState(new Animated.Value(1));
const handlePressIn = () => {
Animated.spring(scaleValue, {
toValue: 0.95,
useNativeDriver: true,
 }).start();
 };
const handlePressOut = () => {
Animated.spring(scaleValue, {
toValue: 1,
useNativeDriver: true,
 }).start();
 };
return (
<Animated.View style={{ transform: [{ scale: scaleValue }] }}>
<TouchableOpacity
style={[
styles.safeButton,
disabled && styles.disabledButton
]}
onPress={onPress}
disabled={disabled || loading}
onPressIn={handlePressIn}
onPressOut={handlePressOut}
activeOpacity={0.8}
>
{loading ? (
<ActivityIndicator color="#fff" size="small" />
 ) : (
<>
<Ionicons name="shield-checkmark" size={24} color="#fff" />
<Text style={styles.safeButtonText}>{text}</Text>
</>
 )}
</TouchableOpacity>
</Animated.View>
 );
};
const styles = StyleSheet.create({
safeButton: {
backgroundColor: '#2ecc71',
flexDirection: 'row',
alignItems: 'center',
justifyContent: 'center',
paddingVertical: 15,
paddingHorizontal: 25,
borderRadius: 30,
...Platform.select({
ios: {
shadowColor: '#000',
shadowOffset: { width: 0, height: 4 },
shadowOpacity: 0.2,
shadowRadius: 5,
 },
android: {
elevation: 8,
 },
 }),
margin: 10,
borderWidth: 1,
borderColor: 'rgba(255, 255, 255, 0.2)',
 },
safeButtonText: {
color: '#fff',
fontWeight: 'bold',
fontSize: 18,
marginLeft: 10,
textShadowColor: 'rgba(0, 0, 0, 0.1)',
textShadowOffset: { width: 0, height: 1 },
textShadowRadius: 2,
 },
disabledButton: {
backgroundColor: '#95a5a6',
opacity: 0.7,
 },
});
export default SafeButton;
