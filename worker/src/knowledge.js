// Shared vocabulary + the behaviour knowledge the agent reasons with.
// Keep CONTEXTS in sync with assets/contexts.js on the frontend.

export const CONTEXTS = {
  doi_an: 'Đói / chờ ăn',
  ra_vao: 'Muốn ra hoặc vào cửa',
  choi: 'Muốn chơi, muốn được chú ý',
  vuot: 'Đang được vuốt ve, âu yếm',
  mot_minh: 'Bị để một mình, ở chỗ lạ',
  chao: 'Chào khi gặp người',
  kho_chiu: 'Khó chịu, bị làm phiền, đau',
  san_moi: 'Thấy con mồi, chim, côn trùng',
  meo_khac: 'Gặp mèo khác',
  khac: 'Khác',
};

export const OUTCOMES = {
  calmed: 'Đáp lại xong bé dịu lại',
  continued: 'Đáp lại rồi bé vẫn kêu',
  ignored: 'Chưa đáp lại',
};

export const FELINE_FIVE = {
  neuroticism: 'Nhạy cảm/lo âu (Neuroticism): bất an, dễ sợ người hoặc mèo khác, nghi ngờ, nhút nhát, căng thẳng',
  extraversion: 'Hướng ngoại/ham khám phá (Extraversion): năng động, tò mò, thông minh, sáng tạo, cảnh giác, kiên trì',
  dominance: 'Áp đảo (Dominance): bắt nạt, tranh giành, hung hăng với mèo khác, ghen, tham ăn',
  impulsiveness: 'Bốc đồng (Impulsiveness): khó đoán, thất thường, liều lĩnh, dễ phân tâm',
  agreeableness: 'Thân thiện (Agreeableness): âu yếm, thân thiện với người, hiền, ham chơi, hợp tác',
};

export const KNOWLEDGE = `
# Kiến thức nền về hành vi mèo (dùng để suy luận, không đọc nguyên văn cho người dùng)

## Tiếng kêu
- Mèo trưởng thành kêu "meo" chủ yếu để giao tiếp với người; giữa mèo với nhau chúng ít meo. Mỗi con hình thành "từ vựng" riêng với chủ, nên cách diễn giải phải dựa trên lịch sử của chính con mèo đó, không áp một bảng chung.
- Meo ngắn, giọng đi lên ở cuối: hay gặp khi chào hoặc đòi hỏi nhẹ. Meo dài, kéo, nhấn mạnh: đòi hỏi rõ (ăn, mở cửa). Meo trầm, đi xuống: than phiền.
- Trill/chirrup (tiếng "mrrp" ngắn, líu lo, miệng gần như khép): chào thân thiện, rủ đi theo.
- Chattering (lạch cạch hàm khi nhìn chim qua cửa kính): phấn khích săn mồi, có thể kèm bức bối vì không bắt được.
- Rừ rừ (purr): thường là thư giãn, nhưng mèo cũng rừ khi đau, sợ, sắp sinh hoặc ốm. Phải đọc cùng bối cảnh và dáng cơ thể.
- Khè (hiss), gừ (growl), rít (spit): sợ hoặc cảnh cáo. Đừng phạt; tạo khoảng cách, bỏ nguồn gây sợ.
- Gào (yowl) kéo dài: mèo cái động dục, tranh lãnh thổ, mất phương hướng ở mèo già, hoặc đau.
- Mèo lớn tuổi bỗng kêu nhiều, nhất là ban đêm: có thể liên quan bệnh (cường giáp, cao huyết áp, suy giảm nhận thức, giảm thị lực/thính lực) → khuyên đi khám thú y.

## Ngôn ngữ cơ thể
- Đuôi dựng thẳng, đầu đuôi hơi cong: thân thiện, chào. Đuôi xù to: sợ. Đuôi quất mạnh/đập: bực, sắp tấn công. Đuôi kẹp dưới bụng: sợ.
- Tai hướng trước: tò mò, thoải mái. Tai xoay ngang/dẹt ra sau ("tai máy bay"): sợ hoặc giận.
- Đồng tử giãn to trong ánh sáng bình thường: kích thích mạnh (sợ, săn mồi, chơi).
- Chớp mắt chậm: tín hiệu thư giãn, tin tưởng. Người chớp mắt chậm lại với mèo có thể giúp mèo tiếp cận (có nghiên cứu ủng hộ).
- Dụi đầu/má (bunting): đánh dấu mùi, gắn kết. Nhào bột (kneading): thư giãn, hành vi từ thời bú mẹ.
- Lật ngửa bụng: tin tưởng, không phải lời mời xoa bụng; nhiều mèo sẽ cào nếu bị xoa bụng.
- Liếm môi, nuốt, ngáp liên tục, quay mặt đi: dấu hiệu căng thẳng nhẹ.

## Tính cách: Feline Five (Litchfield và cộng sự, 2017; 2.802 con mèo, chủ chấm thang 7 điểm)
- Neuroticism: bất an, lo âu, sợ người, nghi ngờ, nhút nhát, căng thẳng.
- Extraversion: quyết đoán, thông minh, tò mò, sáng tạo, năng động, cảnh giác, kiên trì.
- Dominance: bắt nạt, áp đảo, hung hăng với mèo khác, ghen, tham ăn.
- Impulsiveness: bốc đồng, thất thường, liều lĩnh, dễ phân tâm.
- Agreeableness: âu yếm, thân thiện với người, hiền, ham chơi, hợp tác.
Gợi ý theo tính cách: Neuroticism cao → giữ lịch sinh hoạt ổn định, có chỗ trốn và chỗ cao, thay đổi từ từ. Extraversion cao → đồ chơi trí tuệ, giấu thức ăn, thay đồ chơi luân phiên. Dominance cao (nhà nhiều mèo) → tách tài nguyên: nhiều bát, nhiều khay cát (số mèo + 1), nhiều chỗ nằm. Impulsiveness cao → môi trường an toàn, chơi đều đặn để xả năng lượng. Agreeableness thấp → để mèo chủ động tiếp cận, không ép bế.

## Cách đáp lại (hướng dẫn chủ)
- Đáp lại tiếng kêu đòi ăn ngay lập tức sẽ dạy mèo kêu nhiều hơn. Nếu muốn giảm: cho ăn theo giờ cố định, dùng máy cho ăn hẹn giờ, chỉ thưởng khi mèo yên lặng.
- Muốn chú ý/muốn chơi: 2–3 phiên chơi "săn mồi" mỗi ngày, 10–15 phút, kết thúc bằng việc cho "bắt" được và cho ăn.
- Sợ/cảnh cáo: không nhìn chằm chằm, không đưa tay, cho đường lui, giảm âm thanh; chờ mèo tự bình tĩnh.
- Không bao giờ khuyên đánh, xịt nước, hét: làm mèo sợ người và tăng hành vi vấn đề.

## Dấu hiệu cần đi thú y (nói rõ, không chẩn đoán)
- Khẩn cấp: mèo (nhất là mèo đực) rặn trong khay cát mà không ra nước tiểu hoặc ra rất ít; khó thở, thở há miệng; bỏ ăn trên 24 giờ; nôn hoặc tiêu chảy liên tục; co giật; liệt chân sau đột ngột; ngộ độc (hoa ly, thuốc người).
- Nên khám sớm: kêu nhiều bất thường, trốn liên tục, đi vệ sinh ngoài khay, liếm một vùng đến rụng lông, sụt cân, uống nước nhiều.
`.trim();
