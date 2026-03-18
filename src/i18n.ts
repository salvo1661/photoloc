export const supportedLanguages = [
  "en",
  "es",
  "pt",
  "fr",
  "de",
  "hi",
  "ja",
  "ko",
  "id",
  "ar",
  "zh",
];

export const languageNames: Record<string, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  hi: "हिन्दी",
  ja: "日本語",
  ko: "한국어",
  id: "Bahasa Indonesia",
  ar: "العربية",
  zh: "中文",
};

type Messages = {
  title: string;
  description: string;
  home: string;
  subTitle: string;
  notFound: string;
};

export const messages: Record<string, Messages> = {
  en: {
    title: "Image Editor",
    description: "A browser-based image editor with privacy-first design.",
    home: "Welcome to Photo Craft",
    subTitle: "Crop, resize, rotate, adjust, and export images client-side.",
    notFound: "Page not found.",
  },
  es: {
    title: "Editor de Imágenes",
    description: "Un editor de imágenes en el navegador con diseño centrado en la privacidad.",
    home: "Bienvenido a Photo Craft",
    subTitle: "Recorta, redimensiona, gira, ajusta y exporta imágenes del lado del cliente.",
    notFound: "Página no encontrada.",
  },
  pt: {
    title: "Editor de Imagens",
    description: "Um editor de imagens no navegador com design focado em privacidade.",
    home: "Bem-vindo ao Photo Craft",
    subTitle: "Corte, redimensione, gire, ajuste e exporte imagens no cliente.",
    notFound: "Página não encontrada.",
  },
  fr: {
    title: "Éditeur d'Images",
    description: "Un éditeur d'images basé sur le navigateur avec une conception axée sur la confidentialité.",
    home: "Bienvenue sur Photo Craft",
    subTitle: "Recadrez, redimensionnez, faites pivoter, ajustez et exportez des images côté client.",
    notFound: "Page non trouvée.",
  },
  de: {
    title: "Bildeditor",
    description: "Ein browserbasierter Bildeditor mit datenschutzorientiertem Design.",
    home: "Willkommen bei Photo Craft",
    subTitle: "Zuschneiden, Größe ändern, drehen, anpassen und Bilder clientseitig exportieren.",
    notFound: "Seite nicht gefunden.",
  },
  hi: {
    title: "इमेज संपादक",
    description: "प्राइवेसी-फर्स्ट डिज़ाइन के साथ ब्राउज़र-आधारित इमेज एडिटर.",
    home: "Photo Craft में आपका स्वागत है",
    subTitle: "कैंप, आकार बदलें, घुमाएँ, समायोजित करें और क्लाइंट-साइड पर छवियाँ निर्यात करें.",
    notFound: "पृष्ठ नहीं मिला.",
  },
  ja: {
    title: "画像エディター",
    description: "プライバシーファースト設計のブラウザベース画像編集ツールです。",
    home: "Photo Craftへようこそ",
    subTitle: "トリミング、リサイズ、回転、調整、クライアント側で書き出し。",
    notFound: "ページが見つかりません。",
  },
  ko: {
    title: "이미지 편집기",
    description: "개인정보 보호 중심 설계의 브라우저 기반 이미지 편집기입니다.",
    home: "Photo Craft에 오신 것을 환영합니다",
    subTitle: "자르기, 크기 조정, 회전, 조정, 클라이언트 측 내보내기.",
    notFound: "페이지를 찾을 수 없습니다.",
  },
  id: {
    title: "Editor Gambar",
    description: "Editor gambar berbasis browser dengan desain privasi terlebih dahulu.",
    home: "Selamat datang di Photo Craft",
    subTitle: "Potong, ubah ukuran, putar, sesuaikan, dan ekspor gambar di sisi klien.",
    notFound: "Halaman tidak ditemukan.",
  },
  ar: {
    title: "محرر الصور",
    description: "محرر صور يعمل في المتصفح بتصميم يركز على الخصوصية.",
    home: "مرحبًا بك في Photo Craft",
    subTitle: "قص، تغيير الحجم، تدوير، تعديل، وتصدير الصور على الجانب العميل.",
    notFound: "الصفحة غير موجودة.",
  },
  zh: {
    title: "图像编辑器",
    description: "一个以隐私为先设计的浏览器图像编辑器。",
    home: "欢迎来到 Photo Craft",
    subTitle: "裁剪、调整大小、旋转、调整并客户端导出图像。",
    notFound: "页面未找到。",
  },
};

export function getMessages(lang: string): Messages {
  return messages[supportedLanguages.includes(lang) ? lang : "en"];
}
