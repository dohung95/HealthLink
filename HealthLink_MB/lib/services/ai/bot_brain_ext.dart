class SpecialtyMatch {
  final String specialty;
  final Map<String, String> label;
  final String icon;
  final List<String> keywords;

  const SpecialtyMatch({
    required this.specialty,
    required this.label,
    required this.icon,
    required this.keywords,
  });
}

const List<SpecialtyMatch> specialtySymptomMap = [
  SpecialtyMatch(
    specialty: 'Internal Medicine',
    label: {'vi': 'Nội tổng quát', 'en': 'Internal Medicine', 'id': 'Penyakit Dalam'},
    icon: '🩺',
    keywords: [
      'mệt mỏi', 'sốt kéo dài', 'sụt cân', 'thiếu máu', 'tiểu đường', 'huyết áp cao',
      'huyết áp thấp', 'tăng huyết áp', 'suy nhược', 'viêm gan', 'vàng da', 'lao phổi',
      'nhiễm trùng', 'sốt xuất huyết', 'sốt rét', 'bệnh nội khoa', 'nội tổng quát',
      'fatigue', 'prolonged fever', 'weight loss', 'anemia', 'diabetes', 'hypertension',
      'tuberculosis', 'infection', 'dengue', 'malaria', 'internal medicine',
      'khoa nội', 'nội khoa', 'nội tổng quát',
      'kelelahan', 'demam berkepanjangan', 'penurunan berat', 'kurang darah', 'gula darah',
      'hipertensi', 'lemas', 'liver', 'kuning', 'tbc', 'infeksi', 'demam berdarah', 'malaria',
    ],
  ),
  SpecialtyMatch(
    specialty: 'Cardiology',
    label: {'vi': 'Tim mạch', 'en': 'Cardiology', 'id': 'Jantung'},
    icon: '❤️',
    keywords: [
      'đau ngực', 'tức ngực', 'nhồi máu cơ tim', 'đánh trống ngực', 'tim đập nhanh',
      'hở van tim', 'hẹp van tim', 'rối loạn nhịp tim', 'suy tim', 'động mạch vành',
      'tim mạch', 'huyết áp', 'cholesterol', 'mỡ máu', 'khoa tim mạch',
      'chest pain', 'heart attack', 'palpitation', 'heart disease', 'arrhythmia',
      'heart failure', 'coronary', 'angina', 'cardiac', 'cholesterol',
      'nyeri dada', 'serangan jantung', 'jantung berdebar', 'penyakit jantung', 'aritmia',
    ],
  ),
  SpecialtyMatch(
    specialty: 'Neurology',
    label: {'vi': 'Thần kinh', 'en': 'Neurology', 'id': 'Saraf'},
    icon: '🧠',
    keywords: [
      'đau đầu', 'nhức đầu', 'đau nửa đầu', 'migraine', 'chóng mặt', 'hoa mắt',
      'tê tay', 'tê chân', 'run tay', 'đột quỵ', 'liệt', 'động kinh', 'mất trí nhớ',
      'alzheimer', 'parkinson', 'bppv', 'thần kinh tọa', 'mất ngủ', 'rối loạn giấc ngủ',
      'thần kinh', 'khoa thần kinh',
      'headache', 'migraine', 'dizziness', 'vertigo', 'numbness', 'stroke', 'seizure',
      'memory loss', 'tremor', 'epilepsy', 'parkinson', 'alzheimer', 'neuropathy',
      'sakit kepala', 'pusing', 'vertigo', 'kebas', 'stroke', 'kejang', 'lupa',
    ],
  ),
  SpecialtyMatch(
    specialty: 'Dermatology',
    label: {'vi': 'Da liễu', 'en': 'Dermatology', 'id': 'Kulit'},
    icon: '🌿',
    keywords: [
      'ngứa', 'nổi mẩn', 'mề đay', 'dị ứng da', 'phát ban', 'mụn', 'mụn trứng cá',
      'rụng tóc', 'hói đầu', 'viêm da', 'chàm', 'vẩy nến', 'nấm da', 'lang ben',
      'da liễu', 'da khô', 'nám', 'tàn nhang', 'khoa da liễu',
      'itchy', 'rash', 'hives', 'urticaria', 'allergy skin', 'acne', 'pimple',
      'hair loss', 'alopecia', 'eczema', 'psoriasis', 'fungal', 'dermatitis',
      'gatal', 'ruam', 'biduran', 'alergi kulit', 'jerawat', 'rambut rontok', 'eksem',
    ],
  ),
  SpecialtyMatch(
    specialty: 'Pediatrics',
    label: {'vi': 'Nhi khoa', 'en': 'Pediatrics', 'id': 'Anak'},
    icon: '👶',
    keywords: [
      'trẻ em', 'trẻ nhỏ', 'em bé', 'bé', 'con', 'nhi khoa', 'trẻ sốt', 'trẻ ho',
      'bé khóc', 'trẻ biếng ăn', 'trẻ chậm phát triển', 'tiêm chủng trẻ em',
      'bé sơ sinh', 'vàng da sơ sinh', 'khoa nhi',
      'child', 'baby', 'infant', 'toddler', 'kid', 'pediatric', 'child fever', 'child cough',
      'newborn', 'vaccination child',
      'anak', 'bayi', 'balita', 'anak sakit', 'bayi demam', 'anak batuk',
    ],
  ),
  SpecialtyMatch(
    specialty: 'Obstetrics & Gynecology',
    label: {'vi': 'Sản phụ khoa', 'en': 'Obstetrics & Gynecology', 'id': 'Kandungan'},
    icon: '🤰',
    keywords: [
      'mang thai', 'thai kỳ', 'sinh con', 'đau bụng kinh', 'rong kinh', 'kinh nguyệt',
      'phụ khoa', 'sản khoa', 'khí hư', 'viêm âm đạo', 'u xơ tử cung', 'buồng trứng',
      'lạc nội mạc', 'tránh thai', 'vô sinh', 'hiếm muộn', 'siêu âm thai',
      'phụ sản', 'sản phụ khoa', 'khoa sản', 'khoa phụ sản',
      'pregnant', 'pregnancy', 'period pain', 'menstrual', 'gynecology', 'obstetrics',
      'vaginal discharge', 'fibroids', 'ovarian', 'contraception', 'infertility',
      'hamil', 'kehamilan', 'sakit haid', 'menstruasi', 'kandungan', 'keputihan',
      'kontrasepsi', 'program hamil',
    ],
  ),
  SpecialtyMatch(
    specialty: 'ENT',
    label: {'vi': 'Tai mũi họng', 'en': 'ENT', 'id': 'THT'},
    icon: '👂',
    keywords: [
      'đau tai', 'ù tai', 'viêm tai giữa', 'sổ mũi', 'nghẹt mũi', 'viêm xoang',
      'chảy máu mũi', 'đau họng', 'viêm họng', 'amidan', 'khàn tiếng', 'tai mũi họng',
      'nhiệt miệng', 'loét miệng', 'polyp mũi',
      'ear pain', 'tinnitus', 'otitis', 'runny nose', 'sinusitis', 'nosebleed',
      'sore throat', 'tonsil', 'hoarse', 'ent', 'nasal polyp', 'mouth ulcer',
      'tai mũi họng', 'khoa tai mũi họng',
      'sakit telinga', 'telinga berdenging', 'hidung meler', 'sinusitis', 'mimisan',
      'sakit tenggorokan', 'amandel', 'suara serak', 'tht',
    ],
  ),
  SpecialtyMatch(
    specialty: 'Ophthalmology',
    label: {'vi': 'Mắt', 'en': 'Ophthalmology', 'id': 'Mata'},
    icon: '👁️',
    keywords: [
      'đau mắt', 'mắt đỏ', 'lẹo mắt', 'chắp mắt', 'khô mắt', 'nhìn mờ', 'mờ mắt',
      'mất thị lực', 'đục thủy tinh thể', 'glôcôm', 'cận thị', 'viễn thị', 'loạn thị',
      'kết mạc', 'viêm kết mạc', 'mắt lé',
      'eye pain', 'red eye', 'stye', 'dry eye', 'blurry vision', 'vision loss',
      'cataract', 'glaucoma', 'myopia', 'conjunctivitis', 'ophthalmology',
      'mắt', 'nhãn khoa', 'khoa mắt',
      'mata merah', 'mata kering', 'pandangan kabur', 'katarak', 'glaukoma', 'rabun',
    ],
  ),
  SpecialtyMatch(
    specialty: 'Surgery',
    label: {'vi': 'Ngoại khoa', 'en': 'Surgery', 'id': 'Bedah'},
    icon: '🔬',
    keywords: [
      'phẫu thuật', 'mổ', 'u bướu', 'sỏi mật', 'sỏi thận', 'viêm ruột thừa', 'thoát vị',
      'trĩ nặng', 'bướu cổ', 'ngoại khoa', 'vết thương', 'chấn thương nặng', 'khoa ngoại',
      'surgery', 'operation', 'tumor', 'gallstone', 'appendicitis', 'hernia',
      'hemorrhoid surgery', 'wound', 'trauma surgery',
      'operasi', 'bedah', 'tumor', 'batu empedu', 'usus buntu', 'hernia', 'wasir parah',
    ],
  ),
  SpecialtyMatch(
    specialty: 'Dentistry',
    label: {'vi': 'Nha khoa', 'en': 'Dentistry', 'id': 'Gigi'},
    icon: '🦷',
    keywords: [
      'đau răng', 'sâu răng', 'viêm nướu', 'mất răng', 'nhổ răng', 'trám răng',
      'niềng răng', 'răng khôn', 'nha khoa', 'nướu chảy máu', 'hàm răng',
      'toothache', 'cavity', 'gum disease', 'tooth extraction', 'braces',
      'wisdom tooth', 'dentistry', 'dental', 'bleeding gum',
      'nha khoa', 'khoa răng', 'răng hàm mặt',
      'sakit gigi', 'gigi berlubang', 'gusi berdarah', 'cabut gigi', 'behel', 'gigi bungsu',
    ],
  ),
];
