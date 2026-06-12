/// Logic chatbot offline — port từ BotBrain.jsx.
/// Không cần gọi API, 0 token cost.
class BotBrain {
  BotBrain._();

  // ── Phát hiện ngôn ngữ ──────────────────────────────────────────────────────
  static String _detectLang(String text) {
    final hasVI = RegExp(
      r'[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]',
      caseSensitive: false,
    ).hasMatch(text);
    if (hasVI) return 'vi';

    final hasID = RegExp(
      r'saya|aku|sakit|demam|batuk|pusing|dokter|obat|rumah sakit|mau|tolong|terima kasih|halo|hai|selamat|ya|tidak',
      caseSensitive: false,
    ).hasMatch(text);
    if (hasID) return 'id';

    return 'en';
  }

  static String _t(String lang, String en, String vi, String id) {
    if (lang == 'vi') return vi;
    if (lang == 'id') return id;
    return en;
  }

  static bool _has(String lower, List<String> keys) =>
      keys.any((k) => lower.contains(k));

  /// Suy luận tự động: Dù Gemini trả lời (không qua shortcut),
  /// nếu user hoặc AI có nhắc đến khám/bác sĩ thì vẫn hiện nút Đặt lịch.
  static Map<String, String>? inferAction(String userText, String botReply) {
    final lowerUser = userText.toLowerCase();
    final lowerBot = botReply.toLowerCase();
    final lang = _detectLang(userText);

    if (_has(lowerUser, ['khám', 'kham', 'bác sĩ', 'bac si', 'đặt lịch', 'dat lich', 'book', 'appointment', 'dokter', 'janji']) ||
        _has(lowerBot, ['đặt lịch', 'chuyên khoa', 'bác sĩ', 'book an appointment', 'buat janji'])) {
      return {
        'actionLabel': _t(lang, '📅 Book Appointment', '📅 Đặt lịch khám', '📅 Buat Janji'),
        'actionRoute': '/booking',
      };
    }
    return null;
  }

  // ── Keywords shortcut (không gọi AI) ─────────────────────────────────────
  /// Trả về {reply, actionLabel, actionRoute} hoặc null nếu không khớp.
  static Map<String, String>? checkKeyword(String text) {
    final lower = text.toLowerCase().trim();

    // Lọc câu hỏi chuyên sâu → nhường Gemini
    if (lower.contains('?')) return null;
    final lang = _detectLang(text);

    final questionWords = {
      'vi': ['gì', 'sao', 'thế nào', 'tại sao', 'được không', 'tư vấn', 'hỏi', 'chữa', 'điều trị', 'triệu chứng'],
      'en': ['what', 'how', 'why', 'who', 'where', 'consult', 'advice', 'symptom', 'treat', 'cure'],
      'id': ['apa', 'bagaimana', 'kenapa', 'mengapa', 'tanya', 'konsultasi', 'gejala', 'cara'],
    };
    if ((questionWords[lang] ?? []).any((w) => RegExp('\\b$w\\b', caseSensitive: false).hasMatch(lower))) {
      return null;
    }

    // Shortcut: đặt lịch
    if (_has(lower, ['đặt lịch', 'dat lich', 'book', 'appointment', 'schedule', 'lịch khám', 'janji dokter', 'khám bệnh', 'kham benh', 'khám', 'kham'])) {
      return {
        'reply': _t(lang,
          '📅 Want to book an appointment? Tap the button below!',
          '📅 Bạn muốn đặt lịch khám bệnh? Nhấn vào nút bên dưới để đặt ngay!',
          '📅 Mau buat janji dokter? Tap di bawah ini!'),
        'actionLabel': _t(lang, '📅 Book Appointment', '📅 Đặt lịch khám', '📅 Buat Janji'),
        'actionRoute': '/booking',
      };
    }

    // Shortcut: tìm bác sĩ
    if (_has(lower, ['bác sĩ', 'bac si', 'find doctor', 'doctor', 'tìm bác sĩ', 'cari dokter', 'dokter'])) {
      return {
        'reply': _t(lang,
          '🩺 Looking for a doctor? Browse our doctor list!',
          '🩺 Bạn muốn tìm bác sĩ? Xem danh sách bác sĩ ngay!',
          '🩺 Mau cari dokter? Lihat daftar dokter kami!'),
        'actionLabel': _t(lang, '🩺 View Doctors', '🩺 Xem bác sĩ', '🩺 Lihat Dokter'),
        'actionRoute': '/doctors',
      };
    }

    // Shortcut: khẩn cấp
    if (_has(lower, ['khẩn cấp', 'cấp cứu', 'emergency', 'urgent', 'darurat'])) {
      return {
        'reply': _t(lang,
          '🚨 Emergency? Call 115 immediately or go to the nearest hospital!',
          '🚨 Khẩn cấp? Gọi ngay 115 hoặc đến bệnh viện gần nhất!',
          '🚨 Darurat? Langsung telepon 119 atau ke IGD terdekat!'),
        'actionLabel': _t(lang, '📅 Book Urgent', '📅 Đặt khẩn cấp', '📅 Buat Janji Darurat'),
        'actionRoute': '/booking',
      };
    }

    return null;
  }

  // ── Offline symptom matching ──────────────────────────────────────────────
  /// Trả về câu trả lời offline hoặc null nếu không khớp.
  static String? getBotResponse(String text) {
    if (text.trim().isEmpty) return null;
    final lower = text.toLowerCase();
    final lang = _detectLang(text);

    bool has(List<String> keys) => _has(lower, keys);
    String t(String en, String vi, String id) => _t(lang, en, vi, id);

    // Cấp cứu ưu tiên
    if (has(['worst headache', 'đau đầu đột ngột kinh khủng', 'sakit kepala mendadak paling parah'])) {
      return t('⚡ Sudden worst headache → possible brain hemorrhage → GO TO ER IMMEDIATELY!',
          '⚡ Đau đầu đột ngột kinh khủng → có thể XUẤT HUYẾT NÃO → ĐI CẤP CỨU NGAY!',
          '⚡ Sakit kepala mendadak parah → bisa PERDARAHAN OTAK → KE IGD SEKARANG!');
    }
    if (has(['chest pain', 'đau ngực', 'tức ngực', 'dada sesak'])) {
      return t('⚡ CHEST PAIN + HARD TO BREATHE → CALL 115 RIGHT NOW!!! ❤️',
          '⚡ ĐAU NGỰC + KHÓ THỞ → GỌI 115 NGAY LẬP TỨC! ❤️',
          '⚡ Dada sesak → TELEPON 119 SEKARANG JUGA!');
    }

    // Đau đầu
    if (has(['headache', 'migraine', 'đau đầu', 'nhức đầu', 'đau nửa đầu', 'sakit kepala', 'pusing'])) {
      return t('Headache sucks 😣 Rest in a dark quiet room, drink water, take paracetamol. Keeps coming back? Let\'s book a neuro doc!',
          'Đau đầu khó chịu quá 😣 Nằm nghỉ chỗ tối + uống nhiều nước + paracetamol nha. Đau hoài thì mình đặt bác sĩ thần kinh cho bạn nhé!',
          'Sakit kepala ya? Istirahat di tempat tenang, minum air + paracetamol. Sering kambuh? Booking dokter saraf yuk!');
    }

    // Sốt
    if (has(['fever', 'high fever', 'sốt', 'sốt cao', 'demam'])) {
      return t('Got a fever? Drink tons of water, take paracetamol every 6h. Over 38.5°C for 3+ days → see a doctor!',
          'Sốt hả? Uống thật nhiều nước + paracetamol mỗi 6 tiếng. Sốt ≥38.5°C kéo dài 3 ngày là phải đi khám liền!',
          'Demam? Minum air banyak + paracetamol tiap 6 jam. >38.5°C lebih 3 hari → ke dokter ya!');
    }

    // Ho + đau họng
    if (has(['cough', 'sore throat', 'ho', 'đau họng', 'rát họng', 'batuk', 'sakit tenggorokan'])) {
      return t('Cough & sore throat? Warm honey-lemon water is magic 😋 Rest well. Over 7 days or hard to breathe → doctor time!',
          'Ho + đau họng? Nước ấm + chanh + mật ong là thần dược luôn 😋 Nghỉ ngơi nhiều vào. Kéo dài hơn tuần hoặc khó thở thì đi khám nhé!',
          'Batuk + tenggorokan sakit? Air hangat + madu lemon 😋 Istirahat ya. Lebih dari seminggu → ke dokter!');
    }

    // Sổ mũi / viêm xoang
    if (has(['runny nose', 'sinusitis', 'sổ mũi', 'nghẹt mũi', 'viêm xoang', 'hidung meler', 'pilek'])) {
      return t('Runny nose? Steam + saline spray helps. Yellow mucus >10 days → sinus infection, see ENT!',
          'Sổ mũi/nghẹt mũi? Xông hơi + xịt nước muối là đỡ liền. Đờm vàng/xanh kéo dài >10 ngày thì bị viêm xoang rồi, đi khám tai mũi họng nha!',
          'Hidung meler? Uap + semprot saline. Ingus kuning >10 hari → sinusitis, ke dokter THT yuk!');
    }

    // Đau bụng / tiêu chảy
    if (has(['stomach ache', 'diarrhea', 'vomiting', 'đau bụng', 'tiêu chảy', 'nôn', 'buồn nôn', 'sakit perut', 'diare', 'muntah'])) {
      return t('Tummy trouble? Sip ORS slowly. Blood, severe pain or can\'t keep water down → hospital now!',
          'Đau bụng/tiêu chảy? Uống Oresol từng ngụm nhỏ nha. Có máu, đau dữ dội hoặc nôn mãi → đi viện liền!',
          'Sakit perut + diare? Minum Oralit sedikit-sedikit. Ada darah atau parah → langsung RS!');
    }

    // Chóng mặt
    if (has(['dizzy', 'vertigo', 'chóng mặt', 'hoa mắt', 'pusing berputar'])) {
      return t('Feeling dizzy? Sit/lie down immediately. Drink water, eat something light. Happens often → let\'s check!',
          'Chóng mặt? Ngồi hoặc nằm xuống ngay kẻo ngã! Uống nước + ăn nhẹ. Hay bị thế này thì đi khám cho chắc nhé!',
          'Pusing? Duduk dulu biar ga jatuh. Minum air + makan sedikit. Sering gini harus periksa!');
    }

    // Ngứa / dị ứng
    if (has(['itchy', 'rash', 'hives', 'ngứa', 'nổi mẩn', 'mề đay', 'dị ứng', 'gatal', 'biduran'])) {
      return t('Itchy rash? Don\'t scratch! Take antihistamine. Face/lips swell or hard to breathe → EMERGENCY!',
          'Ngứa + nổi mẩn? Đừng gãi! Uống kháng histamine thử. Sưng mặt/môi hoặc khó thở → CẤP CỨU LIỀN!',
          'Gatal + bentol? Jangan digaruk! Minum obat alergi. Bengkak muka/bibir → DARURAT!');
    }

    // Đau lưng
    if (has(['back pain', 'lower back', 'đau lưng', 'sakit pinggang'])) {
      return t('Back pain? Rest + warm compress + gentle stretching. Pain shoots down leg → possible slipped disc!',
          'Đau lưng? Nghỉ ngơi + chườm ấm + tập nhẹ. Đau lan xuống chân → khả năng thoát vị đĩa đệm, đặt bác sĩ ngay nha!',
          'Sakit punggung? Istirahat + kompres hangat. Nyeri ke kaki → hernia nukleus, booking dokter tulang!');
    }

    // Mệt mỏi
    if (has(['fatigue', 'tired', 'mệt mỏi', 'mệt', 'yếu người', 'lelah'])) {
      return t('Always tired? Could be anemia, thyroid, or vitamin D deficiency → blood test recommended!',
          'Mệt mỏi hoài dù ngủ đủ? Có thể thiếu máu, suy giáp hoặc thiếu vitamin D → đi xét nghiệm máu cho chắc nhé!',
          'Selalu lemas? Bisa anemia/tiroid/vit D kurang → cek darah yuk!');
    }

    // Mất ngủ
    if (has(['insomnia', 'can\'t sleep', 'mất ngủ', 'khó ngủ', 'susah tidur'])) {
      return t('Can\'t sleep? No phone 1h before bed, warm milk, deep breathing. Still bad after 2 weeks → sleep specialist!',
          'Mất ngủ hoài? Tắt điện thoại trước ngủ 1 tiếng, uống sữa ấm, hít thở sâu. Vẫn không ngủ được 2 tuần → đi khám tâm thần/giấc ngủ nha!',
          'Susah tidur? Matikan HP 1 jam sebelum tidur, susu hangat, napas dalam. >2 minggu → ke dokter tidur!');
    }

    // Lo âu / stress
    if (has(['anxiety', 'stress', 'depression', 'lo âu', 'căng thẳng', 'trầm cảm', 'stres'])) {
      return t('Feeling anxious? Try 4-7-8 breathing. It\'s okay to ask for help – I can book a psychologist for you ❤️',
          'Lo lắng/căng thẳng? Thử hít thở 4-7-8 nha. Không sao đâu, cần hỗ trợ thì mình đặt bác sĩ tâm lý cho bạn liền ❤️',
          'Cemas/stres? Teknik napas 4-7-8. Gak apa-apa minta tolong, aku bantu booking psikolog ❤️');
    }

    // Đau răng
    if (has(['toothache', 'dental', 'đau răng', 'sâu răng', 'sakit gigi'])) {
      return t('Toothache? Rinse with warm salt water, take painkiller, book dentist ASAP!',
          'Đau răng kinh khủng hả? Súc miệng nước muối ấm + giảm đau tạm, nhưng phải đặt nha sĩ liền nha, để lâu sưng mặt đó!',
          'Sakit gigi? Kumur air garam hangat + obat nyeri, tapi booking dokter gigi sekarang!');
    }

    // Đau mắt
    if (has(['eye pain', 'red eye', 'đau mắt', 'mắt đỏ', 'mata merah'])) {
      return t('Red/painful eyes? Wash with saline, NO rubbing! Blurry vision → eye doctor today!',
          'Mắt đỏ/đau? Rửa nước muối, ĐỪNG DỤI MẮT! Nhìn mờ → đi khám mắt ngay hôm nay!',
          'Mata merah/perih? Cuci air garam, JANGAN DIGOSOK! Pandangan kabur → ke dokter mata hari ini!');
    }

    // Mang thai
    if (has(['pregnant', 'pregnancy', 'mang thai', 'thai kỳ', 'hamil'])) {
      return t('Pregnant or think you might be? Book OBGYN for first check-up! Congratulations ❤️',
          'Nghi mang thai? Đặt lịch sản phụ khoa khám thai lần đầu nha! Chúc mừng bạn sắp làm mẹ ❤️',
          'Hamil atau curiga hamil? Booking dokter kandungan untuk USG pertama! Selamat ya ❤️');
    }

    // Sốt xuất huyết
    if (has(['dengue', 'sốt xuất huyết', 'demam berdarah'])) {
      return t('⚡ High fever + severe body pain + rash → suspect dengue → hospital immediately for blood test!',
          '⚡ Sốt cao + đau nhức toàn thân + phát ban → NGHI SỐT XUẤT HUYẾT → ĐI VIỆN XÉT NGHIỆM MÁU NGAY!',
          '⚡ Demam tinggi + nyeri hebat + ruam → CURIGA DBD → LANGSUNG RS CEK DARAH!');
    }

    // Tiểu đường
    if (has(['diabetes', 'tiểu đường', 'đái tháo đường', 'gula darah'])) {
      return t('Diabetes? Check sugar regularly, low-sugar diet, exercise. Book endocrinologist for best control!',
          'Tiểu đường? Đo đường huyết đều đặn + ăn ít tinh bột + tập thể dục. Đặt bác sĩ nội tiết để kiểm soát tốt nhất!',
          'Diabetes? Cek gula rutin + diet rendah gula + olahraga. Booking dokter endokrin ya!');
    }

    // Huyết áp cao
    if (has(['hypertension', 'high blood pressure', 'huyết áp cao', 'tăng huyết áp', 'hipertensi'])) {
      return t('High blood pressure? Low salt, exercise, take meds regularly. Book cardiologist for check-up!',
          'Huyết áp cao? Ăn nhạt + tập thể dục + uống thuốc đúng giờ. Đặt lịch tim mạch kiểm tra cho chắc nhé!',
          'Tekanan darah tinggi? Kurangi garam + olahraga + minum obat rutin. Booking dokter jantung yuk!');
    }

    // Hen suyễn
    if (has(['asthma', 'wheezing', 'hen suyễn', 'khó thở', 'asma'])) {
      return t('Asthma acting up? Use your blue inhaler. Not better in 15 mins → hospital now!',
          'Hen lên cơn? Xịt thuốc cắt cơn (màu xanh) ngay. 15 phút không đỡ → đi bệnh viện liền!',
          'Asma kambuh? Semprot inhaler biru. 15 menit gak membaik → langsung RS!');
    }

    // Chào hỏi
    if (has(['hi', 'hello', 'hey', 'chào', 'xin chào', 'halo', 'hai'])) {
      return t('Hey there! How can I help you today? 😊',
          'Chào bạn! Hôm nay đang khó chịu gì kể mình nghe nào 🥰',
          'Halo! Ada keluhan apa hari ini? 😄');
    }

    // Cảm ơn
    if (has(['thanks', 'thank you', 'cảm ơn', 'cám ơn', 'terima kasih'])) {
      return t('Anytime! 💕', 'Có gì đâu mà 🫶', 'Sama-sama ya! 😊');
    }

    // Tạm biệt
    if (has(['bye', 'goodbye', 'tạm biệt', 'hẹn gặp lại', 'sampai jumpa'])) {
      return t('Take care & get well soon! ❤️', 'Mau khỏe nha, có gì nhắn mình liền nhé! ❤️', 'Cepet sembuh ya! 💕');
    }

    // Chi phí
    if (has(['cost', 'price', 'how much', 'fee', 'bao nhiêu tiền', 'giá', 'phí', 'biaya', 'berapa'])) {
      return t('Each doctor has their own fee. Check their profile for pricing details!',
          'Phí khám mỗi bác sĩ khác nhau. Xem hồ sơ bác sĩ để biết giá nhé!',
          'Biaya konsultasi tiap dokter beda. Cek profil dokter untuk detailnya ya!');
    }

    return null; // Không khớp → nhường Gemini
  }
}
