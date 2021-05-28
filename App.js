


import React,{ useState, useEffect, useCallback, useRef} from 'react';
import { StyleSheet, Text, View, TextInput, Button, FlatList, Alert, Image, Platform, LogBox} from 'react-native';
import * as firebase from 'firebase';
import * as ImagePicker from 'expo-image-picker';
import uuid from "uuid";
import{ Icon} from'react-native-elements';
import { NavigationContainer} from '@react-navigation/native';
import { createStackNavigator} from '@react-navigation/stack';


// expo install firebase
// npm install expo-image-picker
// npm  install react-native-elements
// npm install @react-navigation/native
// expo install react-native-gesture-handler react-native-reanimated react-native-screens react-native-safe-area-context @react-native-community/masked-view
// npm  install @react-navigation/stack

// Kuvien lataamisessa Firebase Storageen on käytetty hyväksi koodia osoitteessa https://github.com/expo/examples/blob/master/with-firebase-storage-upload/App.js
// https://javascript.plainenglish.io/upload-photos-from-expo-to-firebase-3051c80c23eb

// https://github.com/expo/examples/tree/master/with-firebase-storage-upload 
// https://javascript.plainenglish.io/upload-photos-from- expo-to-firebase-3051c80c23eb
// https://docs.expo.io/versions/latest/sdk/imagepicker/


var firebaseConfig = {
  apiKey: "AIzaSyCRBrkkoZnF8Pay6DB4V0TPRMRz2wbqEyQ",
  authDomain: "shoppinglist-493a1.firebaseapp.com",
  databaseURL: "https://shoppinglist-493a1-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "shoppinglist-493a1",
  storageBucket: "shoppinglist-493a1.appspot.com",
  messagingSenderId: "738931721155",
  appId: "1:738931721155:web:2182b2ca97bd5c8403b376",
  measurementId: "G-F56TTLK8T4"
};

// Firebasen alustaminen
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}else {
  firebase.app(); // jos Firebase on jo alustettu, käytetään sitä
}

// Firebase asettaa joitakin ajastimia ja tämä laukaisee varoituksia --> kytketään tämä pois päältä
LogBox.ignoreLogs([`Setting a timer for a long period`]);

const Stack = createStackNavigator();


function ShoppingListScreen({ navigation }) {

  const[items, setItems] = useState([]);
  const [image, setImage] = useState(null);
  const[amount, setAmount]  = useState('');
  const[product, setProduct]  = useState('');
  const[id, setId] = useState(0)
  const [uri, setUri] = useState(null);
  const Stack = createStackNavigator();

//tässä haetaan kaikki itemit listalle kun appi käynnistyy ---------------------
//näytetään myös "tyhjä"
//haetaan itemien lukumäärä ja muodostetaan id uusille itemeille
  useEffect(()=>  {
     
    firebase.database().ref('items/').on('value', snapshot => {
      const data = snapshot.val();
      const num = snapshot.numChildren()
      
      setId(num);

      if (data !== null) {
      const prods = Object.values(data);
      setItems(prods);
      }
      else{
        console.log('empty')
      }
      console.log(num);
    });
    
  }, []);

  //kameran luvat------------------------------------------------------
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          alert('Sorry, we need camera roll permissions to make this work!');
        }
      }
    })();
  }, []);

//-----------------------------------------------------------------------------

// Kuvan valintaan sekä valokuvan ottamiseen on käytetty Expo Image Pickeria 
//ja hyväksi käytetty koodi löytyy --> https://docs.expo.io/versions/latest/sdk/imagepicker/


// ---Kuvan valinta puhelimen kuvagalleriasta--------------------------------------------------------------------------------------
const pickImage = async () => {

  let pickerResult = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.All,
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  });
  console.log('----------------------------------');
  console.log(pickerResult);
  Alert.alert('Image is ready');

  //Jos kuvan käsittely ei keskeydy --> (console.log testausta varten)
  if (!pickerResult.cancelled) {
    let resultUri = await pickerResult.uri;   
   console.log(resultUri);
   setUri(resultUri);
   setImage(resultUri); //päivitetään image jotta se ei olisi tyhjä
   console.log('uri '+ uri); //tässä kohtaa setUri ei vielä ole päivittynyt mutta se päivittyy itemin tallennusta varten vaikka tässä näyttääkin nollaa.   
  }
};

// kuva kameralla ---------------------------------------------
const takePhoto = async () => {
  let pickerResult = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    aspect: [4, 3],
  });

 //Jos kuvan käsittely ei keskeydy --> (console.log testausta varten)
  if (!pickerResult.cancelled) {   
    let resultUri = await pickerResult.uri;
   console.log(resultUri);
   setUri(resultUri);
   setImage(resultUri); //päivitetään image jotta se ei olisi tyhjä
   console.log('uri '+ uri); //tässä kohtaa setUri ei vielä ole päivittynyt mutta se päivittyy itemin tallennusta varten vaikka tässä näyttääkin nollaa. 
  }
};


//----Valittu kuva käsitellään ----------------------------------------------------------------------------------------------

//Käytetään async/awaitia käsittelemään promise (kun kuva ladataan Firebase storageen ja se saa urlin ja tätä urlia odotetaan)
// 1. Tallennetaan item Firebase Databasen items -listaan -------------------------------
const uploadImage = async () => {
 
console.log('tässä uri '+ uri);
 let uriNow = uri;
  try {  
    if (uri) {
      console.log('pitäisi olla pelkkä resultUri'+ uri);
      const uploadUrl = await uploadImageAsync(uriNow); //suoritetaan uploadImageAsync -funktio    
      console.log('uploadUrl '+uploadUrl);
      
      let imageNow = uploadUrl;
      saveItem(imageNow);
   
    }
  } catch (e) { //jos kuvan lataaminen Firebase Storageen ei onnistunut -->
      console.log(e);
      alert("Upload failed, sorry :(");
  }
}

//---Itemin tallennus Firebase databaseen------------------------
const saveItem = (imageNow) => {  
console.log('save item '+ imageNow);
if (product || image ){ //tallennus tehdään jos käyttäjä on antanut tietoihin joko kuvan tai tuotenimen (käyttäjä voi kuitenkin antaa kaikki kysytyt tiedot halutessaan)

setId(id + 1 ) //itemit listautuvat flatlistille ja tallentuvat databaseen

//https://www.fullstackfirebase.com/realtime-database/notes   --> otsikko "Set a ref"
firebase 
.database()
.ref('items/'+id)
.set({
  product: product,
  amount: amount,
  image: imageNow,
  id: id
});  
   
}
else{
  Alert.alert('Error', 'choose a picture or type the name of the product');      
}
setUri(null);
}

//---delete------------------------------------------------------------------------------
// https://www.fullstackfirebase.com/realtime-database/notes   -->  Otsikko "Delete data"
const deleteItem = (id) => {
  console.log(id);
  var adaRef = firebase.database().ref('items/' + id);
  adaRef.remove()
    .then(function() {
      console.log("Remove succeeded.")
    })
    .catch(function(error) {
      console.log("Remove failed: " + error.message)
    });
}
//--Valittu kuva ladataan Firebase Storageen ja se saa urlin (laitesijainnin sijaan) ---------------------------------
// Mitä tässä koodin pätkässä tapahtuu, on minulle hieman epäselvää
async function uploadImageAsync(uri) {
  
  const blob = await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      resolve(xhr.response);
    };
    xhr.onerror = function (e) {
      console.log(e);
      reject(new TypeError("Network request failed"));
    };
    xhr.responseType = "blob";
    xhr.open("GET", uri, true);
    xhr.send(null);
  });

  const ref = firebase.storage().ref().child(uuid.v4());
  const snap = await ref.put(blob);
  const downloadUrl = await snap.ref.getDownloadURL(); //tässä on url joka voidaan tallettaa databaseen

  //Suljetaan blob
  blob.close();

  return downloadUrl; //palautetaan url -->handlePickedImage --> jossa url asetetaan imageen
};

  return (
 
 <View style={styles.container}>

   <Icon type="material" color="#FCB403" size={30} name="wb-sunny" title="Weather" onPress={() => navigation.navigate('Weather') } />

    <FlatList
        style={{marginLeft: "5%"}}
        keyExtractor={item => item.id.toString()}
        renderItem ={({item}) =>
        
        <View style={styles.listcontainer}>

        <Text style={{fontSize: 18, marginTop: 15 }}>{item.product} {item.amount} {item.key} </Text>
        <Image source={{uri:`${item.image}`}} style={{width: 100, height: 100, marginBottom: 8}}  />
        
        <Icon type="material" color="darkblue"  name="done-outline" onPress={()=> deleteItem(item.id)}  />                                                        
        </View>}
        
        data ={items} />

        

      <TextInput placeholder= 'Product name' style = {{ marginTop: 30, fontSize: 18, width: 200, borderColor: 'gray'}}
          onChangeText ={(product) => setProduct(product)}
          value ={product}/>
      
      <TextInput placeholder= 'Amount' style = {{ marginTop: 5, marginBottom: 5, fontSize: 18, width: 200, borderColor: 'gray'}}
         onChangeText ={(amount) => setAmount(amount)}
          value ={amount} />

      
<View style={styles2.container}>
       <Icon type="material" color="darkblue" name="add-photo-alternate" size={30} title="Pick an image from camera roll" onPress={pickImage}   /> 
       <Text>{'        '}</Text>
       <Icon type="material" color="darkblue" name="add-a-photo" size={30} title="Take a picture" onPress={takePhoto} />
       <Text>{'             '}</Text>
        <Button color='#7B89B2' onPress ={uploadImage}  title ="Save" />
        </View>
    </View>
  );
}


//--------------------kesken-------------------------------------------------

function WeatherScreen() {

// const[helsinkiweather,setHelsinkiweather]= React.useState([]);

// const[helsinkiweather2,setHelsinkiweather2]= React.useState([]);


 // React.useEffect(()=> {
 // fetch('api.openweathermap.org/data/2.5/weather?q=Helsinki&appid=dd580631cc11508a1afaee826dc8e3c4')
 //     .then(response=> response.json())
 //     .then(responseData=> {



  return (
      <View style={styles.container}>
           <Text>Temperature:  </Text>
       
      </View>
  );
}
//-----------------------------------------------------------------------


export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Shopping List" backgroundColor='#5C6A8B' options={{
          cardStyle: {
            backgroundColor: '#5C6A8B'}} } component={ShoppingListScreen} />
        <Stack.Screen name="Weather" component={WeatherScreen} />
        
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'flex-end',
    
  },

  
});
const styles2 = StyleSheet.create({
  container: {
  
    
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection:'row',
    padding: 18
    
  },

  
});