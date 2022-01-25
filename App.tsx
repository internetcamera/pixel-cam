import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, FlipType, SaveFormat } from 'expo-image-manipulator';

import Canvas, { Image, ImageData } from 'react-native-canvas';
// import { BayerDithering } from './features/Dithering';

const SIZE = { width: 128, height: 128 };

export default function App() {
  const canvasRef = useRef<Canvas>(null);
  const canvasRef2 = useRef<Canvas>(null);
  const pickImage = async () => {
    // No permissions request is necessary for launching the image library
    let result = (await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
      base64: true
    })) as ImagePicker.ImageInfo;
    if (!result.cancelled) {
      const image = new Image(canvasRef.current!, result.width, result.height);
      const resizedImage = await manipulateAsync(
        result.uri,
        [{ resize: SIZE }],
        { base64: true }
      );
      image.src = `data:image/png;base64, ${resizedImage.base64!}`;
      image.addEventListener('load', () => {
        const ctx = canvasRef.current!.getContext('2d');
        ctx.drawImage(image, 0, 0, SIZE.width, SIZE.height);
        console.log('image drawn');
        // @ts-ignore
        ctx
          .getImageData(0, 0, SIZE.width, SIZE.height)
          .then(async imageData => {
            const data: number[] = Object.values(imageData.data);
            const array = floyd_steinberg(data, SIZE.width, SIZE.height);
            const ctx2 = canvasRef2.current!.getContext('2d');
            for (let x = 0; x < SIZE.width; x++) {
              for (let y = 0; y < SIZE.height; y++) {
                const offset = (y * SIZE.width + x) * 4;
                const a = array[offset + 0];
                const r = array[offset + 1];
                const g = array[offset + 2];
                const b = array[offset + 3];
                ctx2.fillStyle = `rgb(${r}, ${g}, ${b})`;
                ctx2.fillRect(x, y, 1, 1);
              }
              console.log('rendered a row');
            }
          });
      });
    }
  };
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={pickImage}>
        <Text>Pick Image</Text>
      </TouchableOpacity>
      <Canvas style={styles.canvas1} ref={canvasRef} />
      <Canvas style={styles.canvas2} ref={canvasRef2} />

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  image: {
    width: 300,
    height: 300
  },
  canvas1: {
    borderWidth: 2,
    borderColor: 'black',
    ...SIZE
  },
  canvas2: {
    borderWidth: 2,
    borderColor: 'black',
    ...SIZE
  }
});

var weights = [3, 5, 7, 1];

function floyd_steinberg(data: number[], width: number, height: number) {
  for (var i = 0; i < data.length; i += 4) {
    var y = Math.floor(i / 4 / width);
    var x = (i / 4) % width;

    var v = data[i];
    var b = v < 128 ? 0 : 255; // bitonal value
    var err = v - b;

    data[i] = b ? 255 : 0;
    data[i + 1] = b ? 255 : 0;
    data[i + 2] = b ? 255 : 0;
    data[i + 3] = b ? 255 : 0;

    // default Floyd-Steinberg values:
    //     . . .
    //     . @ 7
    //     3 5 1
    if (x + 1 < width) {
      data[i + 4] += (err * weights[0]) / 16;
    }
    if (y + 1 == height) {
      continue;
    }
    if (x > 0) {
      data[i + width * 4 - 4] += (err * weights[1]) / 16;
    }
    data[i + width * 4] += (err * weights[2]) / 16;
    if (x + 1 < width) {
      data[i + width * 4 + 4] += (err * weights[3]) / 16;
    }
  }
  return data;
}
