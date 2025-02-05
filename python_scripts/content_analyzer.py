from textblob import TextBlob # Metin analizi için kullanılır
import json
import sys # Standart giriş/çıkış işlemleri için kullanılır

class ContentAnalyzer:

    def __init__(self):
        self.bad_words = [
            'küfür', 'hakaret', 'kötü', 'aptal', 'salak', 
            'ahmak', 'gerizekalı', 'mal', 'dangalak'
        ]  # Yasaklı kelimeler
        
    def analyze_content(self, text):
        # Metin analizi
        blob = TextBlob(text)
        text_lower = text.lower()
        #Analiz sonuçlarını sözlük olarak toplama

        analysis = {
            'word_count': len(text.split()), # Kelime sayısı
            'char_count': len(text), # Karakter sayısı
            'has_bad_words': any(word in text.lower() for word in self.bad_words), # Yasaklı kelimelerin varlığı
            'sentiment': blob.sentiment.polarity, # Duygu analizi -1 ile 1 arası bir değer döndürür.
            'is_appropriate': True # Varsayılan uygunluk
        }

        
        # İçerik uygunluk kontrolü
        if analysis['has_bad_words']:
            analysis['is_appropriate'] = False
            
        return analysis

if __name__ == "__main__":
    # Node.js'den gelen JSON verisini okuma
    input_data = json.loads(sys.stdin.read()) # stdin'den okuma, node.js'den alınan veri
    
    analyzer = ContentAnalyzer()
    result = analyzer.analyze_content(input_data['content'])
    
    # Sonucu JSON olarak yazdır
    print(json.dumps(result))