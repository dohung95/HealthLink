import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../../config/api_config.dart';
import '../../models/pharmacy/pharmacy_profile.dart';

class PharmacyProfileService {
  PharmacyProfileService._();

  static const Map<String, String> _jsonHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  static Map<String, String> _authHeaders(String token) => {
        ..._jsonHeaders,
        'Authorization': 'Bearer $token',
      };

  static Future<PharmacyProfile> getProfile(String token) async {
    final res = await http
        .get(
          Uri.parse(ApiConfig.pharmacyProfile),
          headers: _authHeaders(token),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return PharmacyProfile.fromJson(data);
    }
    throw HttpException(
        'Failed to load pharmacy profile',
        Uri.parse(ApiConfig.pharmacyProfile));
  }

  static Future<PharmacyProfile> updateProfile(
      String token, Map<String, dynamic> data) async {
    final res = await http
        .put(
          Uri.parse(ApiConfig.pharmacyProfile),
          headers: _authHeaders(token),
          body: jsonEncode(data),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode == 200) {
      final responseData = jsonDecode(res.body) as Map<String, dynamic>;
      return PharmacyProfile.fromJson(responseData);
    }
    throw HttpException(
        'Failed to update pharmacy profile',
        Uri.parse(ApiConfig.pharmacyProfile));
  }

  static Future<String> uploadAvatar(
      String token, String filePath) async {
    final request = http.MultipartRequest(
      'POST',
      Uri.parse(ApiConfig.pharmacyAvatar),
    )
      ..headers['Authorization'] = 'Bearer $token'
      ..files.add(await http.MultipartFile.fromPath('file', filePath));

    final streamedRes =
        await request.send().timeout(ApiConfig.connectTimeout);
    final res = await http.Response.fromStream(streamedRes);

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return data['avatarUrl']?.toString() ??
          data['url']?.toString() ??
          '';
    }
    throw HttpException(
        'Failed to upload avatar',
        Uri.parse(ApiConfig.pharmacyAvatar));
  }

  static Future<void> changePassword(
      String token, String currentPassword, String newPassword) async {
    final res = await http
        .put(
          Uri.parse(ApiConfig.pharmacyChangePassword),
          headers: _authHeaders(token),
          body: jsonEncode({
            'currentPassword': currentPassword,
            'newPassword': newPassword,
          }),
        )
        .timeout(ApiConfig.connectTimeout);

    if (res.statusCode != 200) {
      throw HttpException(
          'Failed to change password',
          Uri.parse(ApiConfig.pharmacyChangePassword));
    }
  }
}
