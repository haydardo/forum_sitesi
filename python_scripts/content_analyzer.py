from textblob import TextBlob # Metin analizi için kullanılır. Blob, metin,resim,video gibi büyük verileri tutuyor.
import json
import sys # Standart giriş/çıkış işlemleri için kullanılır

class ContentAnalyzer:

    def __init__(self):
        self.bad_words = [
            'küfür', 'hakaret', 'kötü', 'aptal', 'salak', 
            'ahmak', 'gerizekalı', 'mal', 'dangalak'
        ]  # Yasaklı kelimeler
        
    def analyze_content(self, text):
        if not text or not isinstance(text, str):
            return {
                'word_count': 0,
                'char_count': 0,
                'has_bad_words': False,
                'sentiment': 0,
                'is_appropriate': True
            }
            
        blob = TextBlob(text)
        text_lower = text.lower()
        #Analiz sonuçlarını sözlük olarak toplama

        analysis = {
            'word_count': len(text.split()), # Kelime sayısı
            'char_count': len(text), # Karakter sayısı
            'has_bad_words': any(word in text_lower for word in self.bad_words), # Yasaklı kelimelerin varlığı
            'sentiment': blob.sentiment.polarity, # Duygu analizi -1 ile 1 arası bir değer döndürür.
            'is_appropriate': True # Varsayılan uygunluk
        }

        
        # İçerik uygunluk kontrolü
        if analysis['has_bad_words']:
            analysis['is_appropriate'] = False
            
        return analysis

if __name__ == "__main__":
    try:
        # stdin'den JSON verisini oku
        input_text = sys.stdin.read()
        if not input_text:
            raise ValueError("Boş input")
            
        # JSON parse et
        input_data = json.loads(input_text)
        
        # content değerini al
        content = input_data.get('content', '')
        
        # Analiz yap
        analyzer = ContentAnalyzer()
        result = analyzer.analyze_content(content)
        
        # Sonucu JSON olarak yazdır
        print(json.dumps(result))
        
    except Exception as e:
        error_result = {
            'error': str(e),
            'is_appropriate': False
        }
        print(json.dumps(error_result))
        sys.exit(1)