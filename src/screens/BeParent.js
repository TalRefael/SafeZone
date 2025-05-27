import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Image,
  BackHandler,
} from 'react-native';
import { getAuth, signOut } from 'firebase/auth';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';


const { width, height } = Dimensions.get('window');

const BeParent = ({ navigation }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const translateY = useRef(new Animated.Value(-1000)).current;
  const fadeInContent = useRef(new Animated.Value(0)).current;
  const sectionAnimations = useRef(Array.from({ length: 8 }, () => new Animated.Value(0))).current;
  

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const closeMenu = () => {
    if (isMenuOpen) {
      setIsMenuOpen(false);
    }
  };

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  // Handle back button press
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      closeMenu();
      return false;
    });

    return () => backHandler.remove();
  }, [isMenuOpen]);

  const handleLogout = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      navigation.replace('Login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  // Animation for the background and content
  useEffect(() => {
    Animated.timing(translateY, {
      toValue: height * -0.8,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    Animated.timing(fadeInContent, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Animate each section with a delay
    sectionAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 800,
        delay: 300 + index * 250,
        useNativeDriver: true,
      }).start();
    });
  }, [translateY, fadeInContent, sectionAnimations]);

  const footerButtonAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    footerButtonAnimations.forEach((anim, index) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 500,
        delay: index * 300,
        useNativeDriver: true,
      }).start();
    });
  }, [footerButtonAnimations]);

  // FAQ data
  const faqData = [
    {
      question: 'איך אפשר לזהות סימני מצוקה אצל ילדים בזמן מצב חירום?',
      answer: 'סימני מצוקה יכולים לכלול: שינויים בדפוסי שינה, סיוטים, קשיי ריכוז, נסיגה התפתחותית, התקפי כעס, פחדים חדשים, הצמדות מוגברת להורים, או תלונות על כאבים גופניים. חשוב לשים לב לשינויים בהתנהגות הרגילה של הילד ולהתייעץ עם איש מקצוע אם התסמינים נמשכים מעבר לשבועיים-שלושה.'
    },
    {
      question: 'באיזה גיל כדאי להתחיל לדבר עם ילדים על מצבי חירום?',
      answer: 'ניתן וכדאי לדבר עם ילדים על מצבי חירום בכל גיל, אך באופן המותאם להתפתחותם. לילדים צעירים מאוד (2-4) יש להסביר בפשטות ובקצרה. לילדים בגיל הגן (4-6) אפשר להוסיף מעט מידע ולהדגיש את ההגנה עליהם. ילדים בגיל בית ספר יסודי (6-12) מסוגלים להבין יותר פרטים ולקחת חלק בתכנון. מתבגרים יכולים להבין את המצב באופן מלא יותר ולקחת אחריות מסוימת בתכנון המשפחתי.'
    },
    {
      question: 'כמה זמן מסך מומלץ לאפשר לילדים בזמן מצב חירום?',
      answer: 'בזמן חירום, חשוב לאזן בין הצורך בהסחת דעת לבין החשיפה למידע מטריד. מומלץ להגביל צפייה בחדשות ולפקח על התכנים, לבחור תכנים מתאימים לגיל ומרגיעים, ולקבוע זמני מסך מוגדרים גם בתקופה זו. יש לשלב פעילויות ללא מסך כמו משחקי קופסה, יצירה, קריאה ופעילות גופנית בתוך הבית. הגבלת חשיפה לחדשות מטרידות חשובה במיוחד לילדים צעירים.'
    },
    {
      question: 'איך לעזור לילדים שמתקשים לישון בגלל חרדה בזמן מצב חירום?',
      answer: 'כדאי ליצור שגרת לילה קבועה ומרגיעה, להקדיש זמן לשיחה רגועה לפני השינה, להימנע מצפייה בחדשות או שימוש במסכים לפני השינה, לאפשר אור לילה קטן אם זה מרגיע, להשתמש בטכניקות הרפיה כמו נשימות עמוקות או דמיון מודרך. אם הילד חושש לישון לבד, אפשר להרשות שינה משותפת באופן זמני או לשבת ליד מיטתו עד שיירדם.'
    },
    {
      question: 'מתי כדאי לפנות לעזרה מקצועית עבור הילדים?',
      answer: 'יש לשקול פנייה לעזרה מקצועית אם: סימני המצוקה של הילד נמשכים מעבר לשבועיים-שלושה ללא שיפור, הילד מראה סימני דיכאון או חרדה חמורים (כמו הימנעות מפעילויות שאהב, בכי תכוף, התקפי חרדה), ישנה פגיעה בתפקוד היומיומי (כמו סירוב ללכת למסגרת חינוכית, קשיי אכילה או שינה חמורים), הילד מדבר על פגיעה עצמית או מביע מחשבות אובדניות, או כאשר ההורים מרגישים שהם עצמם מתקשים להתמודד עם המצב ולתמוך בילד כראוי.'
    },
  ];

  return (
    <View style={styles.container}>
      {/* Background */}
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

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>איך לדבר עם ילדים על מצב חירום</Text>
      </View>

      {/* Content */}
      <Animated.View style={[styles.contentContainer, { opacity: fadeInContent }]}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          directionalLockEnabled={true}
        >
          {/* Subtitle */}
          <Animated.View 
            style={[
              styles.subtitleContainer, 
              {
                opacity: sectionAnimations[0],
                transform: [
                  {
                    translateY: sectionAnimations[0].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }
            ]}
          >
            <Text style={styles.subtitle}>
              בדקו מה ילדינו יודעים, הסבירו להם ממה יש להימנע והיעזרו במודל מעש"ה - דגשים לשיחה עם הילדים בעת מצב חירום
            </Text>
            <Text style={styles.introText}>
              התפקיד שלנו המבוגרים, הוא לסייע לילדים להבין מהו מצב החירום וכיצד ניתן להתמודד עמו בהיבט הרגשי וההתנהגותי, ובאופן המותאם לשלב ההתפתחותי שהם נמצאים בו.
            </Text>
          </Animated.View>
          {/* Video Section */}
          <Animated.View 
            style={[
              styles.section, 
              {
                opacity: sectionAnimations[1],
                transform: [
                  {
                    translateY: sectionAnimations[1].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }
            ]}
          >
            <Text style={styles.sectionTitle}>סרטון הסבר</Text>
            <View style={styles.videoContainer}>
              <WebView
                source={{ uri: 'https://www.youtube.com/embed/PZ8Cojt7Xao' }}
                style={styles.video}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsFullscreenVideo={true}
              />
            </View>
          </Animated.View>

          {/* Section 1 */}
          <Animated.View 
            style={[
              styles.section, 
              {
                opacity: sectionAnimations[2],
                transform: [
                  {
                    translateY: sectionAnimations[2].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }
            ]}
          >
            <Text style={styles.sectionTitle}>התמודדות רגשית במצבי חירום</Text>
            <Text style={styles.paragraph}>
              מצבי חירום מעוררים מגוון רגשות ותחושות, בהם חששות, פחד, תחושת פגיעות, חוסר ביטחון ודאגה מפני הבאות. האופן שבו ילדים מגיבים למצבים אלו תלוי בגילם, אישיותם, חומרת וקרבת האירוע הטראומטי ורמת התמיכה אותה הם מקבלים מהמשפחה ומהחברים.
            </Text>
            <Text style={styles.paragraph}>
              המקור החשוב ביותר להתמודדות של הילדים בעיתות משבר הם ההורים. רוב הילדים יתאוששו ממשבר ללא עזרה מקצועית, בסיועם של הקרובים אליהם. בשל כך, חשוב כי ההורים יהיו קשובים לסימני מצוקה שמשדרים הילדים ויתמכו בהם.
            </Text>
          </Animated.View>

          {/* Section 2 */}
          <Animated.View 
            style={[
              styles.section, 
              {
                opacity: sectionAnimations[3],
                transform: [
                  {
                    translateY: sectionAnimations[3].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }
            ]}
          >
            <Text style={styles.sectionTitle}>היערכות משפחתית</Text>
            <Text style={styles.paragraph}>
              התמודדות משפחתית כיחידה אחת, מאפשרת להתמודד עם המצב טוב יותר. לכן חשוב להכין את הילדים למה שצפוי לקרות באמצעות תרגול התנהגות נכונה בעת קבלת התרעה, ותכנון תפקידים המתאימים לגילם.
            </Text>
            <Text style={styles.paragraph}>
              מומלץ להכין "תוכנית חירום משפחתית" הכוללת את האופן שבו יש לנהוג בעת קבלת התרעה, הדרכים להזעיק עזרה בשעת הצורך וליצור קשר עם בני המשפחה, חלוקת תפקידים בין בני המשפחה, וכדומה.
            </Text>
            <Text style={styles.paragraph}>
              בזמן חירום, המשפחה נדרשת לפעול כיחידה אחת וחשוב שהמסר יהיה "ביחד נתגבר".
            </Text>
          </Animated.View>

          {/* Section 3 */}
          <Animated.View 
            style={[
              styles.section, 
              {
                opacity: sectionAnimations[4],
                transform: [
                  {
                    translateY: sectionAnimations[4].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }
            ]}
          >
            <Text style={styles.sectionTitle}>מודל מעש"ה</Text>
            <View style={styles.modelContainer}>
              <View style={styles.modelItem}>
                <Text style={styles.modelLetter}>מ</Text>
                <Text style={styles.modelTitle}>מחויבות</Text>
                <Text style={styles.modelDescription}>
                  על ההורים להגיד תמיד לילד: "אנחנו כאן ביחד בממ"ד ו/או בבית ועוזרים אחד לשני".
                </Text>
              </View>
              
              <View style={styles.modelItem}>
                <Text style={styles.modelLetter}>ע</Text>
                <Text style={styles.modelTitle}>עידוד לפעילות יעילה</Text>
                <Text style={styles.modelDescription}>
                  חשוב לתת לכל אחד מהילדים להיות אחראי על משהו שהוא לוקח איתו למרחב המוגן - טלפון נייד, חטיף, בובה, וכל דבר שרואים לנכון.
                </Text>
              </View>
              
              <View style={styles.modelItem}>
                <Text style={styles.modelLetter}>ש</Text>
                <Text style={styles.modelTitle}>שאלות חשיבה</Text>
                <Text style={styles.modelDescription}>
                  כדי להעניק לילדים תחושת ביטחון בזמן השהייה במרחב המוגן, מומלץ לתת להם משימות המחייבות פעילות מחשבתית.
                </Text>
              </View>
              
              <View style={styles.modelItem}>
                <Text style={styles.modelLetter}>ה</Text>
                <Text style={styles.modelTitle}>הבנייה של רצף האירועים</Text>
                <Text style={styles.modelDescription}>
                  כדי לשמור על המרחב הפנימי מוגן, חשוב מאוד לסגור את האירוע. לקראת היציאה מהמרחב המוגן, חשוב לסכם את מה שקרה.
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Section 4 */}
          <Animated.View 
            style={[
              styles.section, 
              {
                opacity: sectionAnimations[5],
                transform: [
                  {
                    translateY: sectionAnimations[5].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }
            ]}
          >
            <Text style={styles.sectionTitle}>דגשים לשיחה עם הילדים</Text>
            <View style={styles.tipContainer}>
              <View style={styles.tipItem}>
                <Text style={styles.tipTitle}>בדקו מה הילדים יודעים</Text>
                <Text style={styles.tipDescription}>
                  התחילו בשיחה פתוחה במהלכה שמעו מהילדים מה הם כבר שמעו, מה הם מבינים וכיצד הם מרגישים לגבי נושאים אלו.
                </Text>
              </View>
              
              <View style={styles.tipItem}>
                <Text style={styles.tipTitle}>השתמשו במושגים מעולמם</Text>
                <Text style={styles.tipDescription}>
                  חשוב לדבר איתם באופן מותאם לגילם ובגובה העיניים. אל תשתמשו במילים גבוהות כדי להסביר להם את המצב.
                </Text>
              </View>
              
              <View style={styles.tipItem}>
                <Text style={styles.tipTitle}>העבירו תחושה של ביטחון</Text>
                <Text style={styles.tipDescription}>
                  נסו להעביר לילדים תחושת ביטחון עד כמה שאפשר. כך למשל: "הצבא שומר עלינו ואנחנו שומרים עליכם".
                </Text>
              </View>
              
              <View style={styles.tipItem}>
                <Text style={styles.tipTitle}>אפשרו לילדים להתבטא</Text>
                <Text style={styles.tipDescription}>
                  אפשרו להם לשאול שאלות ולתת להם לבטא את עצמם גም באופן רגשי. אל תתביישו לומר להם כי המלחמה מפחידה גם מבוגרים.
                </Text>
              </View>
              
              <View style={styles.tipItem}>
                <Text style={styles.tipTitle}>תרגלו את ההנחיות</Text>
                <Text style={styles.tipDescription}>
                  תרגלו מדי פעם כניסה למרחב המוגן, ובצעו זאת עם הילדים בצורה רגועה ונינוחה ככל האפשר.
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Section 5 */}
          <Animated.View 
            style={[
              styles.section, 
              {
                opacity: sectionAnimations[6],
                transform: [
                  {
                    translateY: sectionAnimations[6].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }
            ]}
          >
            <Text style={styles.sectionTitle}>מסרי העצמה</Text>
            <Text style={styles.paragraph}>
              ילדים אינם מכירים עדיין את כל הכוחות הטמונים בהם ואינם מחזיקים בניסיון עם מצבי לחץ וחירום. משום כך, הם עלולים לחוש בצורה מוגברת חוויה של חוסר שליטה במהלך מצב חירום.
            </Text>
            <Text style={styles.paragraph}>
              עדויות וסיפורים מאירועים שונים בעולם, מלמדים כי ילדים רבים שמצאו עצמם בתוך אירוע חירום, תפקדו היטב ולעיתים אף הצילו חייהם וחיי אחרים. סיפורים שונים, שמציגים את הילדים כ"גיבורים לרגע", מאפשרים לבצע תהליך העצמה של הילדים.
            </Text>
            <Text style={styles.emphasis}>
              יש לשים לב שאין להעמיס על כתפי הילדים אחריות רבה מידי. סביר ולגיטימי שילדים ייתמכו רגשית על ידי הוריהם ומבוגרים אחרים שיהיו נוכחים במקום.
            </Text>
          </Animated.View>

          {/* FAQ Section */}
          <Animated.View 
            style={[
              styles.section, 
              {
                opacity: sectionAnimations[7],
                transform: [
                  {
                    translateY: sectionAnimations[7].interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                ],
              }
            ]}
          >
            <Text style={styles.sectionTitle}>שאלות נפוצות</Text>
            <View style={styles.faqContainer}>
              {faqData.map((faq, index) => (
                <View key={index} style={styles.faqItem}>
                  <TouchableOpacity 
                    style={styles.faqQuestion}
                    onPress={() => toggleFaq(index)}
                  >
                    <Text style={styles.faqQuestionText}>{faq.question}</Text>
                    <Ionicons 
                      name={expandedFaq === index ? "chevron-up" : "chevron-down"} 
                      size={24} 
                      color="#446678" 
                    />
                  </TouchableOpacity>
                  {expandedFaq === index && (
                    <View style={styles.faqAnswer}>
                      <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Additional space at the bottom */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </Animated.View>

      {/* Menu overlay */}
      {isMenuOpen && (
        <View style={styles.menu}>
      
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Text style={styles.menuText}>התנתקות</Text>
        </TouchableOpacity>
      </View>
      )}

      {/* Footer */}
      
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#efefef',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    position: 'absolute',
    top: 0,
    width: '100%',
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(0, 0, 0, 0.25)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
    textAlign: 'center',
    fontFamily: 'Roboto',
    marginBottom: -140,
  },
  backButton: {
    position: 'absolute',
    left: 15,
    top: 60,
    padding: 10,
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
  contentContainer: {
    flex: 1,
    marginTop: 200,
    zIndex: 1,
    marginBottom:100,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  scrollViewContent: {
    paddingTop: 20,
  },
  subtitleContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#446678',
    lineHeight: 24,
    marginBottom: 10,
    textAlign: 'right',
  },
  introText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
    textAlign: 'right',
  },
  section: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#446678',
    marginBottom: 10,
    textAlign: 'right',
  },
  videoContainer: {
    width: '100%',
    height: 240,
    marginTop: 10,
    marginBottom: 10,
  },
  video: {
    flex: 1,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 22,
    color: '#333',
    marginBottom: 10,
    textAlign: 'right',
  },
  modelContainer: {
    marginTop: 10,
  },
  modelItem: {
    backgroundColor: 'rgba(88, 129, 146, 0.15)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  modelLetter: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#446678',
    marginBottom: 5,
  },
  modelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#446678',
    marginBottom: 5,
  },
  modelDescription: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  tipContainer: {
    marginTop: 10,
  },
  tipItem: {
    backgroundColor: 'rgba(213, 219, 203, 0.4)',
    borderRadius: 10,
    padding: 15,
    marginBottom: 12,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#446678',
    marginBottom: 5,
    textAlign: 'right',
  },
  tipDescription: {
    fontSize: 16,
    color: '#333',
    textAlign: 'right',
  },
  emphasis: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    backgroundColor: 'rgba(88, 129, 146, 0.15)',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    textAlign: 'right',
  },
  faqContainer: {
    marginTop: 10,
  },
  faqItem: {
    backgroundColor: 'rgba(213, 219, 203, 0.2)',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#446678',
    flex: 1,
    textAlign: 'right',
  },
  faqAnswer: {
    padding: 15,
    paddingTop: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  faqAnswerText: {
    fontSize: 15,
    color: '#333',
    textAlign: 'right',
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
    marginTop: -10,
  },
  footerIcon: {
    width: 30,
    height: 30,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    zIndex: 100,
  },
  menuItem: {
    padding: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
  },
});

export default BeParent;
