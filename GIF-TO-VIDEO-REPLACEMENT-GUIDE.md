# GIF to Video Replacement Guide

## 🎬 Your GIFs Have Been Converted!

All your large GIFs have been converted to MP4/WebM video format and uploaded to Cloudinary.
This reduces file sizes by 90-95% and makes them load much faster!

## 📝 How to Update Your Code

### Before (GIF as Image):
```jsx
const EmmettTillGif = () => {
  const [gifUrl, setGifUrl] = useState(null);
  
  useEffect(() => {
    const loadGif = async () => {
      try {
        const url = await getStorageImageUrl('photos/GIFs/Emmett-till02.gif');
        setGifUrl(url);
      } catch (error) {
        console.error('Failed to load gif:', error);
      }
    };
    loadGif();
  }, []);
  
  return <img src={gifUrl} alt="..." />;
};
```

### After (Video):
```jsx
const EmmettTillVideo = () => {
  return (
    <video 
      autoPlay 
      loop 
      muted 
      playsInline
      className="w-full h-full object-contain"
    >
      <source src="https://res.cloudinary.com/.../Emmett-till02.mp4" type="video/mp4" />
      <source src="https://res.cloudinary.com/.../Emmett-till02.webm" type="video/webm" />
    </video>
  );
};
```

## 🔄 Step-by-Step Replacement


### 1. Bobby-Seale.gif

**Replace this pattern:**
```javascript
getStorageImageUrl('photos/GIFs/Bobby-Seale.gif')
```

**With this video tag:**
```jsx
<video autoPlay loop muted playsInline className="w-full h-full object-contain">
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762835719/civil-rights/GIFs/Bobby-Seale.mp4" type="video/mp4" />
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762835719/civil-rights/GIFs/Bobby-Seale.webm" type="video/webm" />
</video>
```

**Direct URLs:**
- MP4: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762835719/civil-rights/GIFs/Bobby-Seale.mp4`
- WebM: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762835719/civil-rights/GIFs/Bobby-Seale.webm`


### 2. Demonstrations-in-Jackson,-Assassination-of-Medgar-Evers.gif

**Replace this pattern:**
```javascript
getStorageImageUrl('photos/GIFs/Demonstrations-in-Jackson,-Assassination-of-Medgar-Evers.gif')
```

**With this video tag:**
```jsx
<video autoPlay loop muted playsInline className="w-full h-full object-contain">
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762835855/civil-rights/GIFs/Demonstrations-in-Jackson%2C-Assassination-of-Medgar-Evers.mp4" type="video/mp4" />
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762835855/civil-rights/GIFs/Demonstrations-in-Jackson%2C-Assassination-of-Medgar-Evers.webm" type="video/webm" />
</video>
```

**Direct URLs:**
- MP4: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762835855/civil-rights/GIFs/Demonstrations-in-Jackson%2C-Assassination-of-Medgar-Evers.mp4`
- WebM: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762835855/civil-rights/GIFs/Demonstrations-in-Jackson%2C-Assassination-of-Medgar-Evers.webm`


### 3. Emmett-till02.gif

**Replace this pattern:**
```javascript
getStorageImageUrl('photos/GIFs/Emmett-till02.gif')
```

**With this video tag:**
```jsx
<video autoPlay loop muted playsInline className="w-full h-full object-contain">
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762835915/civil-rights/GIFs/Emmett-till02.mp4" type="video/mp4" />
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762835915/civil-rights/GIFs/Emmett-till02.webm" type="video/webm" />
</video>
```

**Direct URLs:**
- MP4: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762835915/civil-rights/GIFs/Emmett-till02.mp4`
- WebM: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762835915/civil-rights/GIFs/Emmett-till02.webm`


### 4. Long-Hot-Summer.gif

**Replace this pattern:**
```javascript
getStorageImageUrl('photos/GIFs/Long-Hot-Summer.gif')
```

**With this video tag:**
```jsx
<video autoPlay loop muted playsInline className="w-full h-full object-contain">
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762835996/civil-rights/GIFs/Long-Hot-Summer.mp4" type="video/mp4" />
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762835996/civil-rights/GIFs/Long-Hot-Summer.webm" type="video/webm" />
</video>
```

**Direct URLs:**
- MP4: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762835996/civil-rights/GIFs/Long-Hot-Summer.mp4`
- WebM: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762835996/civil-rights/GIFs/Long-Hot-Summer.webm`


### 5. MalcolmX.gif

**Replace this pattern:**
```javascript
getStorageImageUrl('photos/GIFs/MalcolmX.gif')
```

**With this video tag:**
```jsx
<video autoPlay loop muted playsInline className="w-full h-full object-contain">
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836191/civil-rights/GIFs/MalcolmX.mp4" type="video/mp4" />
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836191/civil-rights/GIFs/MalcolmX.webm" type="video/webm" />
</video>
```

**Direct URLs:**
- MP4: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836191/civil-rights/GIFs/MalcolmX.mp4`
- WebM: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836191/civil-rights/GIFs/MalcolmX.webm`


### 6. March-on-Washington.gif

**Replace this pattern:**
```javascript
getStorageImageUrl('photos/GIFs/March-on-Washington.gif')
```

**With this video tag:**
```jsx
<video autoPlay loop muted playsInline className="w-full h-full object-contain">
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836405/civil-rights/GIFs/March-on-Washington.mp4" type="video/mp4" />
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836405/civil-rights/GIFs/March-on-Washington.webm" type="video/webm" />
</video>
```

**Direct URLs:**
- MP4: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836405/civil-rights/GIFs/March-on-Washington.mp4`
- WebM: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836405/civil-rights/GIFs/March-on-Washington.webm`


### 7. Selma,-Protester-Confrontation.gif

**Replace this pattern:**
```javascript
getStorageImageUrl('photos/GIFs/Selma,-Protester-Confrontation.gif')
```

**With this video tag:**
```jsx
<video autoPlay loop muted playsInline className="w-full h-full object-contain">
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836464/civil-rights/GIFs/Selma%2C-Protester-Confrontation.mp4" type="video/mp4" />
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836464/civil-rights/GIFs/Selma%2C-Protester-Confrontation.webm" type="video/webm" />
</video>
```

**Direct URLs:**
- MP4: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836464/civil-rights/GIFs/Selma%2C-Protester-Confrontation.mp4`
- WebM: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836464/civil-rights/GIFs/Selma%2C-Protester-Confrontation.webm`


### 8. Selma,-_Get-Right-with-God_02.gif

**Replace this pattern:**
```javascript
getStorageImageUrl('photos/GIFs/Selma,-_Get-Right-with-God_02.gif')
```

**With this video tag:**
```jsx
<video autoPlay loop muted playsInline className="w-full h-full object-contain">
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836571/civil-rights/GIFs/Selma%2C-_Get-Right-with-God_02.mp4" type="video/mp4" />
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836571/civil-rights/GIFs/Selma%2C-_Get-Right-with-God_02.webm" type="video/webm" />
</video>
```

**Direct URLs:**
- MP4: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836571/civil-rights/GIFs/Selma%2C-_Get-Right-with-God_02.mp4`
- WebM: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836571/civil-rights/GIFs/Selma%2C-_Get-Right-with-God_02.webm`


### 9. Voting-Rights-Act-1965.gif

**Replace this pattern:**
```javascript
getStorageImageUrl('photos/GIFs/Voting-Rights-Act-1965.gif')
```

**With this video tag:**
```jsx
<video autoPlay loop muted playsInline className="w-full h-full object-contain">
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836641/civil-rights/GIFs/Voting-Rights-Act-1965.mp4" type="video/mp4" />
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836641/civil-rights/GIFs/Voting-Rights-Act-1965.webm" type="video/webm" />
</video>
```

**Direct URLs:**
- MP4: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836641/civil-rights/GIFs/Voting-Rights-Act-1965.mp4`
- WebM: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836641/civil-rights/GIFs/Voting-Rights-Act-1965.webm`


### 10. little rock.gif

**Replace this pattern:**
```javascript
getStorageImageUrl('photos/GIFs/little rock.gif')
```

**With this video tag:**
```jsx
<video autoPlay loop muted playsInline className="w-full h-full object-contain">
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836720/civil-rights/GIFs/little%20rock.mp4" type="video/mp4" />
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836720/civil-rights/GIFs/little%20rock.webm" type="video/webm" />
</video>
```

**Direct URLs:**
- MP4: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836720/civil-rights/GIFs/little%20rock.mp4`
- WebM: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836720/civil-rights/GIFs/little%20rock.webm`


### 11. signing.gif

**Replace this pattern:**
```javascript
getStorageImageUrl('photos/GIFs/signing.gif')
```

**With this video tag:**
```jsx
<video autoPlay loop muted playsInline className="w-full h-full object-contain">
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836914/civil-rights/GIFs/signing.mp4" type="video/mp4" />
  <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836914/civil-rights/GIFs/signing.webm" type="video/webm" />
</video>
```

**Direct URLs:**
- MP4: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836914/civil-rights/GIFs/signing.mp4`
- WebM: `https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836914/civil-rights/GIFs/signing.webm`


## 💡 Tips

1. **Remove the useState and useEffect** - Videos load directly, no async needed!
2. **Keep autoPlay, loop, muted, playsInline** - This makes them behave like GIFs
3. **Multiple sources** - Browser picks the best format it supports
4. **Use the helper file** - Import from `src/utils/gifVideos.js` for cleaner code

## ✅ Benefits

- 🚀 **90-95% smaller files** (100MB GIF → 5-10MB video)
- ⚡ **Faster loading** (no async loading needed)
- 🎨 **Better quality** (videos look smoother)
- 💰 **100% FREE** on Cloudinary!
- 📱 **Better mobile performance**

## 🎯 Example: Complete Before & After

### BEFORE (Complex):
```jsx
const [gifUrl, setGifUrl] = useState(null);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadGif = async () => {
    try {
      const url = await getStorageImageUrl('photos/GIFs/March-on-Washington.gif');
      setGifUrl(url);
    } catch (error) {
      console.error('Failed to load gif:', error);
    } finally {
      setLoading(false);
    }
  };
  loadGif();
}, []);

if (loading) return <div>Loading...</div>;
return <img src={gifUrl} alt="March on Washington" />;
```

### AFTER (Simple):
```jsx
return (
  <video autoPlay loop muted playsInline className="w-full h-full object-contain">
    <source src="https://res.cloudinary.com/dgbrj4suu/video/upload/v1762836405/civil-rights/GIFs/March-on-Washington.mp4" type="video/mp4" />
  </video>
);
```

Much simpler! No loading state needed! 🎉
