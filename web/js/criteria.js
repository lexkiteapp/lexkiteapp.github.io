/* 📊 Tiêu chí chấm IELTS (#/criteria): 4 tiêu chí Writing & Speaking (band 4–9) + bài mẫu 3 mức band (5.0 / 6.5 / 8.0)
 * kèm nhận xét chi tiết và bí kíp bứt phá band. Nội dung band = DIỄN GIẢI (không chép nguyên văn) bảng mô tả band công khai của IELTS
 * (Writing Task 1/2 & Speaking, bản cập nhật 5/2023 trên ielts.org) – đối chiếu lại khi IELTS cập nhật. Chữ hiển thị là khóa tiếng Việt, bản Anh ở js/i18n/en/criteria.js. */
(function () {
  const { $, $$, esc } = UI;
  const App = typeof window !== 'undefined' ? window.App : (typeof globalThis !== 'undefined' ? globalThis.App : null);
  const { routes } = App;
  const view = App.view;

  // Dữ liệu tiêu chuẩn hóa tự biên soạn theo tiêu chuẩn học thuật (CONTENT-RULES §2)
  const DATA = {
    "writing": {
      "title": "IELTS Writing Criteria",
      "desc": "Bốn tiêu chí chấm cả Task 1 và Task 2, trọng số bằng nhau (mỗi tiêu chí 25%); trong điểm Writing, Task 2 được tính gấp đôi Task 1.",
      "criteria": [
        {
          "id": "tr",
          "name": "Task Response / Achievement",
          "short": "TR / TA",
          "weight": "25%",
          "icon": "🎯",
          "desc": "Task 2: trả lời đủ mọi phần của đề, nêu lập trường rõ, phát triển và chứng minh ý. Task 1 (Task Achievement): có phần tổng quan, chọn và mô tả đúng các đặc điểm chính, số liệu chính xác.",
          "bands": {
            "4": {
              "summary": "Chỉ đáp ứng đề ở mức tối thiểu hoặc lệch trọng tâm.",
              "details": "Có nêu quan điểm nhưng không rõ; ý chính khó nhận ra, có thể lặp lại, không liên quan hoặc thiếu dẫn chứng.",
              "pitfall": "Đọc lướt đề rồi viết về chủ đề chung, bỏ quên câu hỏi thật."
            },
            "5": {
              "summary": "Chỉ trả lời một phần đề bài.",
              "details": "Có lập trường nhưng cách phát triển chưa rõ, có thể thiếu kết luận; ý chính hạn chế, chưa triển khai đủ, đôi chỗ có chi tiết không liên quan.",
              "pitfall": "Đề hỏi hai ý nhưng chỉ trả lời một."
            },
            "6": {
              "summary": "Trả lời mọi phần của đề, dù có phần sơ sài hơn.",
              "details": "Lập trường phù hợp với đề nhưng kết luận có thể mờ hoặc lặp lại; ý chính liên quan nhưng một số ý chưa được phát triển đủ hoặc chưa rõ.",
              "pitfall": "Liệt kê nhiều ý mà không giải thích vì sao và dẫn đến đâu."
            },
            "7": {
              "summary": "Trả lời mọi phần của đề, lập trường rõ xuyên suốt.",
              "details": "Ý chính được nêu, mở rộng và có dẫn chứng; đôi khi còn khái quát hóa quá mức hoặc ý hỗ trợ chưa thật tập trung.",
              "pitfall": "Dẫn chứng kiểu \"everyone knows that…\" thay vì ví dụ cụ thể."
            },
            "8": {
              "summary": "Trả lời đầy đủ mọi phần của đề.",
              "details": "Bài phát triển tốt, ý liên quan, được mở rộng và có dẫn chứng; chỉ thỉnh thoảng thiếu sót nhỏ về nội dung.",
              "pitfall": "Viết quá dài một ý rồi thiếu thời gian cho ý còn lại."
            },
            "9": {
              "summary": "Trả lời trọn vẹn mọi phần của đề.",
              "details": "Lập trường được phát triển đầy đủ, trả lời thẳng câu hỏi; ý liên quan, mở rộng trọn vẹn và có dẫn chứng tốt; sai sót về nội dung cực hiếm.",
              "pitfall": "Không có điểm yếu điển hình ở mức này."
            }
          }
        },
        {
          "id": "cc",
          "name": "Coherence & Cohesion",
          "short": "CC",
          "weight": "25%",
          "icon": "🧩",
          "desc": "Cách sắp xếp ý theo trình tự logic, chia đoạn và dùng phương tiện liên kết (từ nối, đại từ thay thế, tham chiếu) chính xác, tự nhiên.",
          "bands": {
            "4": {
              "summary": "Có ý nhưng sắp xếp thiếu mạch lạc, không rõ tiến trình.",
              "details": "Dùng vài từ nối cơ bản nhưng có thể sai hoặc lặp; có thể không chia đoạn hoặc chia đoạn gây rối.",
              "pitfall": "Viết cả bài thành một khối, hoặc mỗi câu xuống dòng thành một đoạn."
            },
            "5": {
              "summary": "Có tổ chức nhưng tiến trình tổng thể chưa rõ.",
              "details": "Từ nối dùng thiếu, sai hoặc lạm dụng; tham chiếu và thay thế yếu nên lặp từ; chia đoạn có thể chưa đủ hoặc chưa hợp lý.",
              "pitfall": "Câu nào cũng mở đầu bằng Firstly, Secondly, Moreover…"
            },
            "6": {
              "summary": "Ý được sắp xếp mạch lạc, có tiến trình tổng thể rõ.",
              "details": "Từ nối dùng khá hiệu quả nhưng liên kết trong câu hoặc giữa các câu có thể sai hoặc máy móc; tham chiếu chưa luôn rõ; có chia đoạn nhưng chưa luôn logic.",
              "pitfall": "Dùng \"this\" hoặc \"it\" mà không rõ đang chỉ điều gì."
            },
            "7": {
              "summary": "Ý được sắp xếp logic, tiến trình rõ xuyên suốt.",
              "details": "Dùng nhiều phương tiện liên kết khá linh hoạt, đôi khi còn thiếu hoặc thừa; mỗi đoạn có ý trung tâm rõ.",
              "pitfall": "Từ nối khiên cưỡng, như dùng \"Furthermore\" trước một ý trái ngược."
            },
            "8": {
              "summary": "Trình tự ý logic, mọi khía cạnh liên kết được xử lý tốt.",
              "details": "Chỉ thỉnh thoảng có sai sót nhỏ về liên kết; chia đoạn đủ và hợp lý.",
              "pitfall": "Thêm từ nối chỉ để \"trông học thuật\"."
            },
            "9": {
              "summary": "Liên kết tự nhiên đến mức người đọc không để ý.",
              "details": "Sai sót về mạch lạc, nếu có, là rất ít; chia đoạn được xử lý thành thạo.",
              "pitfall": "Không có điểm yếu điển hình ở mức này."
            }
          }
        },
        {
          "id": "lr",
          "name": "Lexical Resource",
          "short": "LR",
          "weight": "25%",
          "icon": "📚",
          "desc": "Độ rộng và độ chính xác của vốn từ: chọn từ đúng nghĩa, đúng văn phong, kết hợp từ (collocation), chính tả và cấu tạo từ.",
          "bands": {
            "4": {
              "summary": "Vốn từ cơ bản, có thể lặp hoặc không hợp đề.",
              "details": "Kiểm soát cấu tạo từ và chính tả hạn chế; lỗi có thể khiến người đọc khó hiểu.",
              "pitfall": "Dịch từng chữ từ tiếng mẹ đẻ sang tiếng Anh."
            },
            "5": {
              "summary": "Vốn từ hạn chế nhưng tạm đủ cho đề bài.",
              "details": "Lỗi chính tả và/hoặc cấu tạo từ khá rõ, có thể gây khó khăn cho người đọc.",
              "pitfall": "Ghép từ sai kiểu \"make pollution\", \"do a mistake\"."
            },
            "6": {
              "summary": "Vốn từ đủ cho đề bài.",
              "details": "Có thử từ ít thông dụng nhưng đôi khi chưa chính xác; có lỗi chính tả/cấu tạo từ nhưng không cản trở việc truyền đạt.",
              "pitfall": "Dùng từ \"đao to búa lớn\" học thuộc nhưng sai sắc thái."
            },
            "7": {
              "summary": "Vốn từ đủ rộng để diễn đạt linh hoạt và khá chính xác.",
              "details": "Dùng được từ ít thông dụng, có ý thức về văn phong và collocation dù đôi khi chọn từ chưa hợp; chỉ vài lỗi chính tả/cấu tạo từ.",
              "pitfall": "Lẫn từ văn nói (a lot of, kids, stuff) vào bài luận học thuật."
            },
            "8": {
              "summary": "Vốn từ rộng, dùng trôi chảy, linh hoạt và diễn đạt chính xác.",
              "details": "Dùng khéo từ ít thông dụng dù thỉnh thoảng chọn từ hoặc collocation chưa chuẩn; lỗi chính tả/cấu tạo từ rất hiếm.",
              "pitfall": "Thỉnh thoảng một collocation chưa thật tự nhiên."
            },
            "9": {
              "summary": "Vốn từ phong phú, dùng tự nhiên và tinh tế.",
              "details": "Lỗi nhỏ cực hiếm và chỉ là sơ suất.",
              "pitfall": "Không có điểm yếu điển hình ở mức này."
            }
          }
        },
        {
          "id": "gra",
          "name": "Grammatical Range & Accuracy",
          "short": "GRA",
          "weight": "25%",
          "icon": "⚖️",
          "desc": "Độ đa dạng và độ chính xác của cấu trúc câu, kể cả dấu câu.",
          "bands": {
            "4": {
              "summary": "Cấu trúc rất hạn chế, hiếm khi dùng mệnh đề phụ.",
              "details": "Một số cấu trúc đúng nhưng lỗi chiếm ưu thế; dấu câu thường sai.",
              "pitfall": "Câu dài nối liền bằng dấu phẩy (run-on sentence)."
            },
            "5": {
              "summary": "Cấu trúc hạn chế; có thử câu phức nhưng kém chính xác hơn câu đơn.",
              "details": "Lỗi ngữ pháp có thể thường xuyên, dấu câu sai; lỗi có thể gây khó khăn cho người đọc.",
              "pitfall": "Quên -s ở động từ ngôi thứ ba và danh từ số nhiều, sai thì cơ bản."
            },
            "6": {
              "summary": "Kết hợp câu đơn và câu phức.",
              "details": "Có lỗi ngữ pháp và dấu câu nhưng hiếm khi làm giảm khả năng truyền đạt.",
              "pitfall": "Lặp đi lặp lại vài mẫu câu phức quen thuộc."
            },
            "7": {
              "summary": "Dùng nhiều cấu trúc phức khá linh hoạt.",
              "details": "Câu không lỗi xuất hiện thường xuyên; kiểm soát tốt ngữ pháp và dấu câu dù còn vài lỗi.",
              "pitfall": "Vài lỗi lẻ tẻ về mạo từ, giới từ hoặc dấu phẩy."
            },
            "8": {
              "summary": "Cấu trúc đa dạng, dùng linh hoạt và chính xác.",
              "details": "Phần lớn câu không có lỗi; chỉ thỉnh thoảng có lỗi hoặc chỗ dùng chưa phù hợp.",
              "pitfall": "Sơ suất nhỏ khi viết vội cuối giờ."
            },
            "9": {
              "summary": "Cấu trúc đa dạng, hoàn toàn linh hoạt và chính xác.",
              "details": "Ngữ pháp và dấu câu phù hợp xuyên suốt; lỗi nhỏ cực hiếm, chỉ là sơ suất.",
              "pitfall": "Không có điểm yếu điển hình ở mức này."
            }
          }
        }
      ],
      "prompt": {
        "topic": "Technology & Modern Life",
        "type": "Thảo luận hai quan điểm + nêu ý kiến",
        "text": "Some people believe that technology has made our lives more complicated, while others believe it has made life easier. Discuss both views and give your own opinion."
      },
      "models": {
        "5.0": {
          "band": "Band 5.0",
          "scores": {
            "tr": 5,
            "cc": 5,
            "lr": 5,
            "gra": 5
          },
          "essay": `Nowadays, technology is developing very fast in the world. Some people think that technology make life easier, but other people say it makes life more complicated. In this essay, I will discuss both sides and give my opinion.
  
  On the one hand, technology helps people many things. Firstly, mobile phones and internet make communication very fast. We can talk to friends far away with video call. Secondly, machines do hard works for humans in factories. Also, online shopping is very convenient because we can buy food without going outside. Therefore, technology is very good for life.
  
  On the other hand, technology has problems. Firstly, people spend too much time on screen. Children play games all day and they don't study. Secondly, many people lose job because computers do their work. Also, personal information can be stolen by bad people on internet. This makes life very stressful and complicated.
  
  In conclusion, I think technology has both advantages and disadvantages. But if we use it carefully, it will make our life much better than before.`,
          "critique": [
            {
              "id": "tr",
              "title": "Task Response: 5.0",
              "text": "Nêu cả hai quan điểm và có ý kiến riêng, nhưng ý triển khai nông, ví dụ chung chung (children play games all day); chưa giải thích vì sao công nghệ làm cuộc sống \"phức tạp hơn\"."
            },
            {
              "id": "cc",
              "title": "Coherence & Cohesion: 5.0",
              "text": "Từ nối máy móc ở đầu câu (Firstly, Secondly, Also, Therefore); hai đoạn thân bài theo cùng một khuôn, ít dùng tham chiếu."
            },
            {
              "id": "lr",
              "title": "Lexical Resource: 5.0",
              "text": "Từ vựng cơ bản, lặp lại (very fast, very convenient, bad people); sai kết hợp từ và dạng từ: \"do hard works\", \"helps people many things\", \"lose job\"."
            },
            {
              "id": "gra",
              "title": "Grammatical Range & Accuracy: 5.0",
              "text": "Chủ yếu câu đơn và câu ghép với and/but; lỗi hòa hợp chủ – vị (technology make life easier) và thiếu mạo từ (internet, on internet)."
            }
          ]
        },
        "6.5": {
          "band": "Band 6.5",
          "scores": {
            "tr": 6.5,
            "cc": 6.5,
            "lr": 6.5,
            "gra": 6.5
          },
          "essay": `In recent decades, technological advancements have profoundly transformed human existence. While some individuals argue that modern technology introduces unnecessary complexity to daily routines, others contend that it significantly enhances convenience. This essay examines both perspectives before presenting my personal view that the benefits substantially outweigh the drawbacks.
  
  On the one hand, the proliferation of digital devices can indeed complicate life. Primarily, constant connectivity creates immense psychological pressure, as employees are frequently expected to answer emails outside standard working hours. This blurred boundary between professional and personal life leads to chronic stress and burnout. Furthermore, the rapid pace of technological change often alienates older generations, who struggle to navigate essential digital services such as online banking and healthcare appointments.
  
  On the other hand, proponents emphasize that technology has streamlined everyday activities. Firstly, automated domestic appliances and smart logistics have drastically reduced the time required for mundane household tasks. Moreover, online educational platforms have democratized access to high-quality learning materials, allowing students globally to acquire new skills irrespective of geographical boundaries.
  
  In conclusion, although the invasion of digital devices can induce stress and technological isolation for certain groups, I firmly believe that technology fundamentally empowers humanity by automating tedious tasks and bridging geographical divides.`,
          "critique": [
            {
              "id": "tr",
              "title": "Task Response: 6.5",
              "text": "Trả lời đủ các phần của đề, lập trường rõ từ mở bài đến kết bài; các ý về ranh giới công việc – gia đình và người cao tuổi được giải thích, dù vài ý còn khái quát."
            },
            {
              "id": "cc",
              "title": "Coherence & Cohesion: 6.5",
              "text": "Chia đoạn hợp lý, câu chủ đề rõ; từ nối (On the one hand, Furthermore, In conclusion) dùng khá tự nhiên."
            },
            {
              "id": "lr",
              "title": "Lexical Resource: 6.5",
              "text": "Vốn từ khá tốt và đúng ngữ cảnh: blurred boundary, chronic stress, streamline, democratize access."
            },
            {
              "id": "gra",
              "title": "Grammatical Range & Accuracy: 6.5",
              "text": "Dùng tốt câu phức với mệnh đề quan hệ và liên từ phụ thuộc (while, as, although); phần lớn câu đúng, chỉ vài chỗ diễn đạt còn an toàn."
            }
          ]
        },
        "8.0": {
          "band": "Band 8.0",
          "scores": {
            "tr": 8,
            "cc": 8,
            "lr": 8,
            "gra": 8
          },
          "essay": `The pervasive integration of technology into modern existence has sparked ongoing debate regarding whether it liberates humanity or encumbers it with unforeseen friction. While critics legitimately point out that pervasive digital dependence fosters cognitive overload and existential anxiety, I maintain that technological innovation remains an indispensable asset that undeniably elevates human efficiency and quality of life.
  
  The apprehension surrounding technological complexity largely stems from the intrusive nature of ubiquitous connectivity. The contemporary workplace increasingly demands perpetual accessibility, eroding the sacred division between professional obligations and personal sanctuary. When smartphones continuously ping with notifications, individuals experience attention fragmentation, which paradoxically impairs deep intellectual focus rather than enhancing productivity. Additionally, navigating opaque cybersecurity threats and navigating algorithmic dependency create a subtle yet persistent undercurrent of vulnerability among users.
  
  Nevertheless, dismissing technology as merely disruptive overlooks its monumental contributions to human emancipation from drudgery. Modern automated infrastructure and artificial intelligence have eliminated countless hours of repetitive labor, permitting society to reallocate human intellect toward creative and strategic endeavors. In medicine, predictive analytics and remote diagnostics now save countless lives, achieving feats that were unimaginable in prior generations. When evaluated macroscopically, the alleged complexity is not an inherent flaw of technology itself, but rather a transitional friction in our capacity to establish healthy cognitive boundaries.
  
  In conclusion, while the omnipresence of digital tools undeniably introduces psychological burdens and systemic dependencies, these complications represent manageable side effects rather than fatal detriments. Technology ultimately enriches the human experience, provided that society learns to harness its capabilities judiciously.`,
          "critique": [
            {
              "id": "tr",
              "title": "Task Response: 8.0",
              "text": "Lập trường rõ, cân nhắc nghiêm túc quan điểm ngược lại rồi phản biện; các ý được mở rộng và có dẫn chứng (luôn phải trực tuyến khi làm việc, tự động hóa giảm việc lặp lại)."
            },
            {
              "id": "cc",
              "title": "Coherence & Cohesion: 8.0",
              "text": "Liên kết chủ yếu qua tham chiếu, phép song hành và tương phản giữa các câu thay vì từ nối máy móc; mỗi đoạn có ý trung tâm rõ."
            },
            {
              "id": "lr",
              "title": "Lexical Resource: 8.0",
              "text": "Từ ít thông dụng dùng chính xác, đúng văn phong học thuật: pervasive integration, cognitive overload, emancipation from drudgery, judiciously."
            },
            {
              "id": "gra",
              "title": "Grammatical Range & Accuracy: 8.0",
              "text": "Cấu trúc phức đa dạng (mệnh đề phân từ, mệnh đề danh từ, điều kiện với provided that); hầu hết các câu không có lỗi."
            }
          ]
        }
      },
      "jumpTips": [
        {
          "from": "5.0",
          "to": "8.0",
          "title": "Từ band 5.0 lên 6.5: viết chắc tay",
          "steps": [
            "Gộp câu đơn ngắn thành câu phức bằng liên từ phụ thuộc (although, because, whereas) hoặc mệnh đề quan hệ (which, who).",
            "Bỏ thói quen mở đầu mọi câu bằng Firstly, Secondly, In my opinion; dùng cách dẫn tự nhiên hơn: One notable factor is that…, A further consideration is…",
            "Học từ theo cụm (collocation): thay vì nhớ \"pollution\", hãy nhớ \"tackle air pollution\", \"reduce carbon emissions\".",
            "Triển khai mỗi ý theo P-E-E: Point (ý chính) → Explanation (giải thích) → Example (ví dụ cụ thể)."
          ]
        },
        {
          "from": "6.5",
          "to": "8.0",
          "title": "Từ band 6.5 lên 8.0: lập luận chặt, dùng từ chính xác",
          "steps": [
            "Dùng ngôn ngữ rào đón (hedging) khi khái quát: tends to, is likely to, There is a risk that… thay vì khẳng định tuyệt đối.",
            "Liên kết bằng tham chiếu thay cho từ nối đầu câu: This trend, Such measures, These consequences.",
            "Bỏ các câu sáo mòn: every coin has two sides, a double-edged sword, in a nutshell.",
            "Mở rộng ý đến cùng: nêu nguyên nhân, hệ quả và giới hạn của luận điểm, kèm ví dụ cụ thể."
          ]
        }
      ]
    },
    "speaking": {
      "title": "IELTS Speaking Criteria",
      "desc": "Bốn tiêu chí chấm cả ba phần thi (Part 1, 2, 3), trọng số bằng nhau (mỗi tiêu chí 25%).",
      "criteria": [
        {
          "id": "fc",
          "name": "Fluency & Coherence",
          "short": "FC",
          "weight": "25%",
          "icon": "🌊",
          "desc": "Khả năng nói liên tục với tốc độ, độ tự nhiên phù hợp và nối các ý thành lời nói mạch lạc.",
          "bands": {
            "4": {
              "summary": "Không nói tiếp được nếu không ngừng lâu rõ rệt.",
              "details": "Có thể nói chậm, lặp từ và tự sửa thường xuyên; nối được câu đơn nhưng lặp từ nối, đôi chỗ đứt mạch.",
              "pitfall": "Im lặng lâu giữa câu để nghĩ từ."
            },
            "5": {
              "summary": "Thường nói tiếp được nhưng phải nhờ lặp lại, tự sửa hoặc nói chậm.",
              "details": "Hay ngập ngừng giữa câu để tìm từ và ngữ pháp khá cơ bản; lạm dụng vài từ nối; nói ý đơn giản thì trôi, ý phức tạp thì vấp.",
              "pitfall": "Lạm dụng từ đệm (um, you know, like)."
            },
            "6": {
              "summary": "Nói tiếp được và sẵn sàng nói dài.",
              "details": "Đôi khi mất mạch vì ngập ngừng, lặp lại hoặc tự sửa; dùng nhiều từ nối và dấu hiệu diễn ngôn nhưng chưa luôn phù hợp.",
              "pitfall": "Nói dài nhưng lan man, xa dần câu hỏi."
            },
            "7": {
              "summary": "Nói dài dễ dàng, không thấy gắng sức.",
              "details": "Có thể ngập ngừng, lặp lại hoặc tự sửa giữa câu khi tìm từ nhưng không làm mất mạch; dùng linh hoạt từ nối và dấu hiệu diễn ngôn.",
              "pitfall": "Trả lời Part 3 bằng ý chung chung, thiếu lý do và ví dụ."
            },
            "8": {
              "summary": "Trôi chảy, chỉ thỉnh thoảng lặp lại hoặc tự sửa.",
              "details": "Ngập ngừng chủ yếu để nghĩ ý, chỉ đôi khi để tìm từ; chủ đề được phát triển mạch lạc, phù hợp và liên quan.",
              "pitfall": "Thỉnh thoảng dừng để tìm một từ thật chính xác."
            },
            "9": {
              "summary": "Trôi chảy, rất hiếm khi lặp lại hoặc tự sửa.",
              "details": "Ngập ngừng (nếu có) chỉ để chuẩn bị ý, không phải để tìm từ hay ngữ pháp; chủ đề được phát triển hoàn toàn mạch lạc và mở rộng phù hợp.",
              "pitfall": "Không có điểm yếu điển hình ở mức này."
            }
          }
        },
        {
          "id": "lr_sp",
          "name": "Lexical Resource",
          "short": "LR",
          "weight": "25%",
          "icon": "💎",
          "desc": "Độ rộng và độ chính xác của vốn từ khi nói, gồm từ ít thông dụng, thành ngữ và khả năng diễn đạt lại (paraphrase) khi cần.",
          "bands": {
            "4": {
              "summary": "Đủ từ cho chủ đề quen; với chủ đề lạ chỉ diễn đạt được nghĩa cơ bản.",
              "details": "Hay chọn từ sai hoặc không phù hợp; hiếm khi thử diễn đạt lại.",
              "pitfall": "Bí hoàn toàn khi gặp chủ đề trừu tượng."
            },
            "5": {
              "summary": "Đủ từ cho cả chủ đề quen và lạ nhưng kém linh hoạt.",
              "details": "Có thử diễn đạt lại nhưng không phải lúc nào cũng thành công.",
              "pitfall": "Nhồi thành ngữ học thuộc (vd. \"raining cats and dogs\") vào sai ngữ cảnh."
            },
            "6": {
              "summary": "Đủ từ để nói dài về các chủ đề.",
              "details": "Đôi khi dùng từ chưa phù hợp nhưng nghĩa vẫn rõ; nhìn chung diễn đạt lại thành công.",
              "pitfall": "Dùng từ trang trọng kiểu văn viết khi trò chuyện."
            },
            "7": {
              "summary": "Dùng từ linh hoạt cho nhiều chủ đề khác nhau.",
              "details": "Dùng được một số từ ít thông dụng và thành ngữ, có ý thức về văn phong và collocation dù đôi khi chưa phù hợp; diễn đạt lại hiệu quả.",
              "pitfall": "Một vài collocation chưa tự nhiên."
            },
            "8": {
              "summary": "Vốn từ rộng, dùng nhanh, linh hoạt và chính xác cho mọi chủ đề.",
              "details": "Dùng khéo từ ít thông dụng và thành ngữ dù thỉnh thoảng chọn từ hoặc collocation chưa chuẩn; diễn đạt lại hiệu quả khi cần.",
              "pitfall": "Thỉnh thoảng một thành ngữ chưa thật đúng ngữ cảnh."
            },
            "9": {
              "summary": "Dùng từ hoàn toàn linh hoạt và chính xác trong mọi ngữ cảnh.",
              "details": "Dùng từ chính xác và thành ngữ tự nhiên, ổn định suốt bài nói.",
              "pitfall": "Không có điểm yếu điển hình ở mức này."
            }
          }
        },
        {
          "id": "gra_sp",
          "name": "Grammatical Range & Accuracy",
          "short": "GRA",
          "weight": "25%",
          "icon": "🏛️",
          "desc": "Độ đa dạng và độ chính xác của cấu trúc câu khi nói.",
          "bands": {
            "4": {
              "summary": "Nói được câu cơ bản; vài câu ngắn không có lỗi.",
              "details": "Hiếm khi dùng mệnh đề phụ; câu trả lời ngắn, cấu trúc lặp lại, lỗi thường xuyên.",
              "pitfall": "Nói \"Yesterday I go…\" khi kể chuyện quá khứ."
            },
            "5": {
              "summary": "Câu cơ bản khá chính xác.",
              "details": "Có thử câu phức nhưng ít dạng, gần như luôn có lỗi và có thể phải nói lại.",
              "pitfall": "Sai ngôi thứ ba số ít (he go, she like) khi nói nhanh."
            },
            "6": {
              "summary": "Kết hợp câu ngắn và câu phức, cấu trúc khá đa dạng nhưng kém linh hoạt.",
              "details": "Câu phức thường có lỗi nhưng hiếm khi cản trở giao tiếp.",
              "pitfall": "Né câu phức vì sợ sai nên câu trả lời đơn điệu."
            },
            "7": {
              "summary": "Dùng linh hoạt nhiều cấu trúc; câu không lỗi xuất hiện thường xuyên.",
              "details": "Câu đơn và câu phức đều dùng hiệu quả dù còn lỗi; vài lỗi cơ bản vẫn còn.",
              "pitfall": "Vài lỗi cơ bản lặp lại, như thiếu -s hoặc sai thì khi kể chuyện."
            },
            "8": {
              "summary": "Cấu trúc đa dạng, dùng linh hoạt; phần lớn câu không có lỗi.",
              "details": "Thỉnh thoảng có chỗ chưa phù hợp hoặc lỗi không hệ thống; vài lỗi cơ bản có thể còn.",
              "pitfall": "Lỗi lẻ tẻ trong câu dài nhiều mệnh đề."
            },
            "9": {
              "summary": "Cấu trúc chính xác và phù hợp mọi lúc.",
              "details": "Chỉ có những sơ suất mà người bản ngữ cũng mắc khi nói tự nhiên.",
              "pitfall": "Không có điểm yếu điển hình ở mức này."
            }
          }
        },
        {
          "id": "pr",
          "name": "Pronunciation",
          "short": "PR",
          "weight": "25%",
          "icon": "🎙️",
          "desc": "Độ dễ hiểu của lời nói: phát âm từng âm và từ, trọng âm, ngữ điệu, nhịp và nối âm. Giọng địa phương chỉ ảnh hưởng điểm khi làm người nghe khó hiểu.",
          "bands": {
            "4": {
              "summary": "Người nghe phải cố gắng, có đoạn không hiểu được.",
              "details": "Phạm vi đặc điểm phát âm hạn chế; nhịp hay gãy; kiểm soát trọng âm, ngữ điệu kém; hay phát âm sai từ hoặc âm gây khó hiểu.",
              "pitfall": "Nuốt âm cuối (s, ed, t, k) khiến từ khó nhận ra."
            },
            "5": {
              "summary": "Có mọi điểm tốt của band 4 và một phần điểm tốt của band 6.",
              "details": "Thường nằm giữa: rõ hơn band 4 nhưng chưa ổn định như band 6 về nhịp, trọng âm và độ rõ.",
              "pitfall": "Ngữ điệu đều đều, không nhấn vào từ quan trọng."
            },
            "6": {
              "summary": "Nhìn chung dễ hiểu suốt bài, người nghe không mất nhiều công.",
              "details": "Dùng nhiều đặc điểm phát âm nhưng kiểm soát chưa đều; ngắt cụm nhìn chung hợp lý nhưng nhịp có thể bị ảnh hưởng do nói nhanh hoặc thiếu nhấn nhịp; đôi khi phát âm sai làm thiếu rõ.",
              "pitfall": "Sai trọng âm ở từ dài 3–4 âm tiết."
            },
            "7": {
              "summary": "Có mọi điểm tốt của band 6 và một phần điểm tốt của band 8.",
              "details": "Thường rõ và ổn định hơn band 6, nhịp và ngữ điệu tự nhiên hơn nhưng chưa duy trì được như band 8.",
              "pitfall": "Một vài âm khó (/θ/, /ð/) đôi khi còn lẫn."
            },
            "8": {
              "summary": "Dễ hiểu suốt bài; giọng địa phương ảnh hưởng rất ít.",
              "details": "Dùng nhiều đặc điểm phát âm để diễn đạt nghĩa chính xác, tinh tế; giữ nhịp phù hợp, trọng âm và ngữ điệu linh hoạt trong câu dài dù đôi lúc sơ suất.",
              "pitfall": "Đôi lúc ngữ điệu chưa đúng ở câu rất dài."
            },
            "9": {
              "summary": "Người nghe hiểu dễ dàng suốt bài; giọng không ảnh hưởng độ dễ hiểu.",
              "details": "Dùng đầy đủ các đặc điểm phát âm để diễn đạt nghĩa chính xác, tinh tế; nối âm linh hoạt và duy trì suốt bài.",
              "pitfall": "Không có điểm yếu điển hình ở mức này."
            }
          }
        }
      ],
      "prompt": {
        "topic": "A Useful Device",
        "type": "Speaking Part 2 (thẻ đề, nói 1–2 phút)",
        "text": "Describe a piece of technology that you find very useful. You should say: what it is, when you started using it, how you use it, and explain why it is so useful to you."
      },
      "models": {
        "5.0": {
          "band": "Band 5.0",
          "scores": {
            "fc": 5,
            "lr": 5,
            "gra": 5,
            "pr": 5
          },
          "transcript": `Well... I want to talk about my smartphone. It is an iPhone... um... I bought it two years ago when I entered university. My father gave me money to buy it because I need it for study.
  
  I use this phone every day, every time. In the morning, I use alarm to wake up. Then I check Facebook, Zalo and message with my friends. Also, I use it to search information on Google when teacher give homework. Sometimes when I am tired, I listen to music or play games.
  
  This phone is very useful for me because... um... without phone, I feel very lonely and I cannot contact with my family. Also it have good camera so I can take photo with friends. So I think it is the most important thing in my life. Thank you.`,
          "critique": [
            {
              "id": "fc",
              "title": "Fluency & Coherence: 5.0",
              "text": "Ngập ngừng nhiều (Well…, um…), lặp lại \"use\" và nối ý chủ yếu bằng also/so; bài nói khá ngắn so với thời lượng Part 2."
            },
            {
              "id": "lr_sp",
              "title": "Lexical Resource: 5.0",
              "text": "Từ vựng đơn giản (very useful, good camera, take photo, search information), ít cụm từ tự nhiên."
            },
            {
              "id": "gra_sp",
              "title": "Grammatical Range & Accuracy: 5.0",
              "text": "Lỗi cơ bản về hòa hợp chủ – vị và thì (it have good camera, teacher give homework, I need it for study) và thừa giới từ (contact with my family)."
            },
            {
              "id": "pr",
              "title": "Pronunciation: 5.0",
              "text": "Bản chép không thể hiện phát âm; ở band 5 người nghe thường phải cố ở một số chỗ, vd. do thiếu âm cuối (-s, -ed) hoặc ngữ điệu đều đều."
            }
          ]
        },
        "6.5": {
          "band": "Band 6.5",
          "scores": {
            "fc": 6.5,
            "lr": 6.5,
            "gra": 6.5,
            "pr": 6.5
          },
          "transcript": `I'd like to share about my noise-cancelling headphones, which have genuinely become an indispensable gadget in my daily routine. I actually purchased them about a year ago when I started preparing for my university entrance exams. At that time, my neighbourhood was quite noisy due to continuous construction, making it virtually impossible for me to concentrate.
  
  Basically, I use these headphones for several purposes throughout the day. First and foremost, whenever I need to engage in deep study sessions or revise vocabulary, I simply switch on the active noise cancellation feature, which filters out almost all background distractions. Aside from academic purposes, I also put them on during my daily commute on the bus to listen to English podcasts and audiobooks.
  
  What makes this device exceptionally useful to me is the immense boost in productivity it provides. In today's fast-paced environment, having a reliable tool that creates a personal quiet bubble anywhere allows me to maximize my learning efficiency. Honestly speaking, I don't think I could maintain my focus without them.`,
          "critique": [
            {
              "id": "fc",
              "title": "Fluency & Coherence: 6.5",
              "text": "Nói liên tục, đủ dài cho Part 2; dùng từ nối văn nói tự nhiên: actually, Basically, First and foremost, Honestly speaking."
            },
            {
              "id": "lr_sp",
              "title": "Lexical Resource: 6.5",
              "text": "Từ vựng theo chủ đề khá rộng: noise-cancelling headphones, indispensable gadget, background distractions, personal quiet bubble."
            },
            {
              "id": "gra_sp",
              "title": "Grammatical Range & Accuracy: 6.5",
              "text": "Kiểm soát tốt câu phức với mệnh đề quan hệ (which have genuinely become…) và mệnh đề phân từ; còn ít cấu trúc thật sự đa dạng."
            },
            {
              "id": "pr",
              "title": "Pronunciation: 6.5",
              "text": "Bản chép không thể hiện phát âm; ở mức này người nghe nhìn chung hiểu dễ dàng, dù trọng âm và ngữ điệu chưa thật ổn định."
            }
          ]
        },
        "8.0": {
          "band": "Band 8.0",
          "scores": {
            "fc": 8,
            "lr": 8,
            "gra": 8,
            "pr": 8
          },
          "transcript": `If I had to single out one piece of technology that has fundamentally revolutionized my daily life, it would undoubtedly be my e-ink digital notebook. I initially invested in this device roughly eighteen months ago, primarily out of sheer frustration with cluttered piles of physical paperwork and disorganised lecture notes.
  
  What sets this device apart from conventional tablets is its glare-free display that flawlessly mimics the tactile sensation of writing on real paper, without emitting disruptive blue light. I utilize it across virtually every facet of my academic and creative pursuits. During lectures, I effortlessly annotate complex academic journals in PDF format, while in my leisure time, I use it as an expansive digital sketchbook and journal. Furthermore, it automatically syncs with my cloud storage, meaning all my brainstorms are systematically indexed and instantly retrievable.
  
  The reason this piece of technology has proven so profoundly transformative is that it strikes an exquisite balance between minimalist tranquility and digital versatility. Unlike iPads or laptops, it deliberately lacks social media apps or browser notifications, shielding me from cognitive derailment while keeping my intellectual life impeccably organised. In essence, it has not merely made my life easier; it has elevated the caliber of my thinking.`,
          "critique": [
            {
              "id": "fc",
              "title": "Fluency & Coherence: 8.0",
              "text": "Trả lời dài, mạch lạc, đi qua đủ các gợi ý của thẻ đề; các ý nối với nhau tự nhiên, ít phụ thuộc từ nối."
            },
            {
              "id": "lr_sp",
              "title": "Lexical Resource: 8.0",
              "text": "Từ ít thông dụng dùng chính xác: sheer frustration, tactile sensation, strikes an exquisite balance."
            },
            {
              "id": "gra_sp",
              "title": "Grammatical Range & Accuracy: 8.0",
              "text": "Cấu trúc phức đa dạng: câu điều kiện (If I had to single out…), mệnh đề danh từ (What sets this device apart…), mệnh đề phân từ (shielding me from…); hầu như không có lỗi."
            },
            {
              "id": "pr",
              "title": "Pronunciation: 8.0",
              "text": "Bản chép không thể hiện phát âm; ở band 8 người nghe hiểu dễ dàng suốt bài, nhịp và ngữ điệu linh hoạt."
            }
          ]
        }
      },
      "jumpTips": [
        {
          "from": "5.0",
          "to": "8.0",
          "title": "Speaking từ band 5.0 lên 6.5: nói dài, trôi chảy",
          "steps": [
            "Nói đủ độ dài: Part 1 trả lời 2–3 câu (ý chính + lý do/ví dụ), Part 2 nói trọn 1,5–2 phút, không dừng sớm.",
            "Dùng từ nối văn nói tự nhiên: To be honest, As a matter of fact, Speaking of…, thay vì chỉ and, because, so.",
            "Sửa âm cuối /s/, /z/, /t/, /d/: lỗi phổ biến làm từ khó nhận ra.",
            "Luyện 15 phút mỗi ngày: shadowing theo bản ghi âm mẫu, rồi tự ghi âm và nghe lại."
          ]
        },
        {
          "from": "6.5",
          "to": "8.0",
          "title": "Speaking từ band 6.5 lên 8.0: linh hoạt, chính xác",
          "steps": [
            "Luyện trọng âm câu và ngữ điệu: nhấn vào từ mang nội dung chính, hạ giọng cuối câu khẳng định.",
            "Không cần từ \"đao to búa lớn\": điểm cao đến từ từ ít thông dụng, thành ngữ và cụm động từ dùng đúng ngữ cảnh.",
            "Tự sửa nhẹ nhàng khi lỡ sai: \"Or rather…\", \"What I mean is…\", rồi nói tiếp.",
            "Part 3: mở rộng câu trả lời bằng lý do, ví dụ, so sánh và nhìn từ nhiều góc độ (cá nhân, xã hội, các thế hệ)."
          ]
        }
      ]
    }
  };

  // Trạng thái cục bộ trang
  let curSkill = 'writing'; // 'writing' | 'speaking'
  let curBandFilter = 'all'; // 'all' | '5' | '6' | '7' | '8' | '9'
  let curModelBand = '6.5'; // '5.0' | '6.5' | '8.0'
  const wc = s => (String(s || '').trim().match(/\S+/g) || []).length;
  const critMeta = {
    tr: { color: 'var(--accent, #0ea5e9)', bg: 'var(--accent-soft)' },
    cc: { color: 'var(--primary)', bg: 'var(--primary-soft)' },
    lr: { color: '#d97706', bg: 'rgba(217, 119, 6, .12)' },
    gra: { color: 'var(--good)', bg: 'var(--good-soft)' },
    fc: { color: 'var(--accent, #0ea5e9)', bg: 'var(--accent-soft)' },
    pr: { color: 'var(--primary)', bg: 'var(--primary-soft)' }
  };

  function renderPage() {
    const d = DATA[curSkill];
    const isW = curSkill === 'writing';
    const curModel = d.models[curModelBand] || d.models['6.5'];

    view.innerHTML = `
      <div class="page-head">
        <div class="row between" style="flex-wrap:wrap;gap:.8rem;align-items:center">
          <div class="row" style="gap:.9rem;align-items:center">
            ${window.Kit ? `<div class="kit-cele" style="flex-shrink:0" aria-hidden="true">${Kit.svg('think', 64, true)}</div>` : ''}
            <div>
              <div class="tiny muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.05em">IELTS Writing · Speaking</div>
              <h1 style="margin:.15rem 0 .25rem">📊 ${t('Tiêu chí chấm IELTS')}</h1>
              <p class="muted small" style="margin:0">${t('Nắm vững 4 tiêu chí chấm Writing & Speaking từ band 4–9 và cách nâng band bài thi thực tế.')}</p>
              <p class="tiny muted" style="margin:.25rem 0 0">${t('Diễn giải từ bảng mô tả band công khai của IELTS, không phải văn bản chính thức – bản gốc xem tại ielts.org.')}</p>
            </div>
          </div>
          <div class="row" style="gap:.5rem">
            <a href="#/write" class="btn sm ghost">✍️ ${t('Phòng viết')}</a>
            <a href="#/speaking" class="btn sm ghost">🗣️ ${t('Phòng Speaking')}</a>
          </div>
        </div>
      </div>

      <!-- Skill Switcher Tabs -->
      <div class="card" style="margin-bottom:1.2rem;padding:.7rem .9rem;box-shadow:var(--shadow-sm);border-radius:14px">
        <div class="row between" style="flex-wrap:wrap;gap:.8rem;align-items:center">
          <div class="row" style="gap:.5rem" id="skillTabs">
            <button class="btn sm ${isW ? 'primary' : 'ghost'}" data-skill="writing" style="font-weight:700;border-radius:10px">✍️ ${t('IELTS Writing')}</button>
            <button class="btn sm ${!isW ? 'primary' : 'ghost'}" data-skill="speaking" style="font-weight:700;border-radius:10px">🗣️ ${t('IELTS Speaking')}</button>
          </div>
          <div class="row" style="gap:.45rem;align-items:center;flex-wrap:wrap">
            <span class="tiny muted"><b>${t('Lọc band:')}</b></span>
            <div class="row" id="bandFilters" style="gap:.3rem;flex-wrap:wrap">
              ${['all', '4', '5', '6', '7', '8', '9'].map(b => `<button class="chip ${curBandFilter === b ? 'active' : ''}" data-band="${b}" style="cursor:pointer;padding:.25rem .6rem;font-weight:700;font-size:.82rem;border-radius:8px;${curBandFilter === b ? 'background:var(--primary);color:#fff;border-color:var(--primary)' : ''}">${b === 'all' ? t('Tất cả') : 'Band ' + b}</button>`).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- 4 Criteria Bento Grid -->
      <div class="stack" style="gap:1.2rem">
        <div class="row between" style="align-items:baseline">
          <h2 style="font-size:1.35rem;margin:0">${isW ? '✍️ ' + t('4 Tiêu chí IELTS Writing') : '🗣️ ' + t('4 Tiêu chí IELTS Speaking')}</h2>
          <span class="small muted">${esc(t(d.desc))}</span>
        </div>

        <div class="grid" style="grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:1rem" id="criteriaGrid">
          ${d.criteria.map(c => {
            const cm = critMeta[c.id] || { color: 'var(--primary)', bg: 'var(--primary-soft)' };
            return `
            <div class="card" style="display:flex;flex-direction:column;justify-content:space-between;border-top:4px solid ${cm.color};border-radius:14px;box-shadow:var(--shadow-sm)">
              <div>
                <div class="row between" style="margin-bottom:.5rem;align-items:center">
                  <span style="font-size:1.5rem">${c.icon}</span>
                  <span class="chip" style="font-weight:800;background:${cm.bg};color:${cm.color};border:1px solid ${cm.color}">${c.short} · 25%</span>
                </div>
                <h3 style="font-size:1.08rem;margin:0 0 .4rem;color:var(--text)">${esc(c.name)}</h3>
                <p class="small muted" style="margin:0 0 .8rem;line-height:1.55">${esc(t(c.desc))}</p>
              </div>

              <!-- Bands summary -->
              <div class="stack" style="gap:.55rem;border-top:1px dashed var(--line);padding-top:.75rem">
                ${Object.entries(c.bands).filter(([b]) => curBandFilter === 'all' || curBandFilter === b).map(([b, item]) => {
                  const bNum = +b;
                  const bCol = bNum >= 8 ? 'var(--accent-text)' : bNum >= 6.5 ? 'var(--good-text)' : 'var(--gold-text)';
                  return `
                  <div style="background:var(--surface-2);border-radius:10px;padding:.55rem .75rem;border-left:3px solid ${bCol}">
                    <div class="row between" style="margin-bottom:.25rem;align-items:center">
                      <b style="font-size:.88rem;color:${bCol}">Band ${b}</b>
                      <span class="tiny muted" style="font-weight:600">${esc(t(item.summary))}</span>
                    </div>
                    <p class="tiny" style="margin:.25rem 0;line-height:1.52;color:var(--text)">${esc(t(item.details))}</p>
                    <div class="tiny" style="color:var(--again);font-weight:500;margin-top:.25rem">⚠️ ${t('Bẫy cần tránh:')} ${esc(t(item.pitfall))}</div>
                  </div>
                  `;
                }).join('')}
              </div>
            </div>
            `;
          }).join('')}
        </div>

        <!-- Multi-Band Model Comparison Section -->
        <div class="card" style="margin-top:1rem;border:1px solid var(--line);border-radius:16px;padding:1.4rem;box-shadow:var(--shadow-sm)">
          <div class="row between" style="flex-wrap:wrap;gap:.8rem;border-bottom:1px solid var(--line);padding-bottom:1rem;margin-bottom:1.2rem;align-items:center">
            <div>
              <div class="chip" style="background:var(--accent-soft);color:var(--accent);font-weight:800;margin-bottom:.4rem;border:1px solid var(--accent)">
                ${t('Đề mẫu & bài mẫu theo 3 mức band')}
              </div>
              <h2 style="font-size:1.25rem;margin:0">${esc(d.prompt.topic)} · <span class="muted" style="font-weight:400">${esc(t(d.prompt.type))}</span></h2>
            </div>
            <!-- Band Switcher -->
            <div class="row" style="gap:.4rem" id="modelBandTabs">
              ${['5.0', '6.5', '8.0'].map(b => {
                const on = curModelBand === b;
                const bCol = b === '8.0' ? 'var(--accent-text)' : b === '6.5' ? 'var(--good-text)' : 'var(--gold-text)';
                return `
                <button class="btn sm ${on ? 'primary' : 'ghost'}" data-mband="${b}" style="font-weight:800;border-radius:10px;${on ? `background:${bCol};border-color:${bCol}` : ''}">
                  Band ${b}
                </button>
                `;
              }).join('')}
            </div>
          </div>

          <p class="small" style="font-weight:600;font-size:1.02rem;background:var(--surface-2);padding:.85rem 1.1rem;border-radius:12px;border-left:4px solid var(--primary);margin:0 0 1.2rem;line-height:1.6">
            📌 ${esc(d.prompt.text)}
          </p>

          <!-- Model Content & Critique Grid -->
          <div class="grid" style="grid-template-columns:minmax(0, 1.4fr) minmax(0, 1fr);gap:1.2rem" id="modelGrid">
            <!-- Essay / Transcript -->
            <div style="background:var(--surface-2);padding:1.2rem;border-radius:14px;border:1px solid var(--line);display:flex;flex-direction:column">
              <div class="row between" style="margin-bottom:.8rem;align-items:center;flex-wrap:wrap;gap:.4rem">
                <div class="row" style="gap:.4rem;align-items:center">
                  <span class="small muted"><b>${isW ? t('Nội dung bài viết') : t('Bản ghi âm lời nói (Transcript)')}</b></span>
                  <span class="tiny muted">(${t('{n} từ', { n: wc(isW ? curModel.essay : curModel.transcript) })})</span>
                </div>
                <div class="row" style="gap:.4rem;align-items:center">
                  <span class="chip lv" style="background:var(--primary);color:#fff;font-weight:800">${curModel.band}</span>
                  <button class="btn sm ghost" id="crCopy" style="padding:.25rem .5rem" title="${t('Sao chép')}" aria-label="${t('Sao chép')}">📋</button>
                  ${!isW ? `<button class="btn sm primary" id="crTts" style="padding:.25rem .6rem">🔊 ${t('Phát âm')}</button>` : ''}
                </div>
              </div>
              <div style="font-size:1rem;line-height:1.8;white-space:pre-wrap;font-family:var(--font);color:var(--text);flex:1;background:var(--surface);padding:1rem;border-radius:10px;border:1px solid var(--line)">
${esc(isW ? curModel.essay : curModel.transcript)}
              </div>
            </div>

            <!-- Detailed Feedback per Criteria -->
            <div class="stack" style="gap:.8rem">
              <div class="card" style="padding:1.1rem;background:var(--surface);border-radius:14px;box-shadow:var(--shadow-sm);border:1px solid var(--line)">
                <h3 style="font-size:1.05rem;margin:0 0 .7rem">🔍 ${t('Phân tích điểm số 4 tiêu chí')}</h3>
                <div class="stack" style="gap:.6rem">
                  ${Object.entries(curModel.scores).map(([k, score]) => {
                    const bCol = score >= 8 ? 'var(--accent-text)' : score >= 6.5 ? 'var(--good-text)' : 'var(--gold-text)';
                    return `
                    <div style="display:grid;grid-template-columns:85px minmax(0,1fr) 40px;align-items:center;gap:.6rem">
                      <span class="tiny" style="font-weight:700">${k.toUpperCase()}</span>
                      <div class="sbar" style="background:var(--surface-3);height:10px;border-radius:5px;overflow:hidden">
                        <i style="display:block;height:100%;width:${(score / 9) * 100}%;background:${bCol};border-radius:5px;transition:width .25s ease"></i>
                      </div>
                      <span class="tiny" style="font-weight:800;text-align:right;color:${bCol}">${score}</span>
                    </div>
                    `;
                  }).join('')}
                </div>
              </div>

              <div class="stack" style="gap:.6rem">
                ${curModel.critique.map(c => `
                  <div style="background:var(--surface-2);border-radius:10px;padding:.75rem .95rem;border-left:3.5px solid var(--primary)">
                    <b class="small" style="color:var(--primary)">${esc(t(c.title))}</b>
                    <p class="tiny" style="margin:.3rem 0 0;line-height:1.55;color:var(--text)">${esc(t(c.text))}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- Roadmap: How to jump bands -->
        <div class="card" style="padding:1.4rem;border-radius:16px;background:linear-gradient(135deg, var(--surface) 0%, var(--surface-2) 100%);box-shadow:var(--shadow-sm)">
          <h2 style="font-size:1.25rem;margin:0 0 1rem">🚀 ${t('Lộ trình bứt phá Band điểm')}</h2>
          <div class="grid" style="grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:1rem">
            ${d.jumpTips.map(j => `
              <div class="card" style="background:var(--surface);border:1px solid var(--line);border-radius:12px;padding:1.15rem;box-shadow:var(--shadow-sm)">
                <div class="row between" style="margin-bottom:.65rem;align-items:center">
                  <span class="chip" style="background:var(--primary-soft);color:var(--primary);font-weight:800;border:1px solid var(--primary)">Band ${j.from} ➔ Band ${j.to}</span>
                  <span class="tiny muted" style="font-weight:600">✨ ${t('Bước nhảy vọt')}</span>
                </div>
                <h3 style="font-size:1.02rem;margin:0 0 .75rem;color:var(--text)">${esc(t(j.title))}</h3>
                <ul class="small" style="padding-left:1.2rem;margin:0;line-height:1.7">
                  ${j.steps.map(s => `<li style="margin-bottom:.45rem">${esc(t(s))}</li>`).join('')}
                </ul>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Action Call Buttons -->
        <div class="card" style="text-align:center;padding:1.8rem 1rem;border-radius:16px">
          <h3 style="font-size:1.2rem;margin:0 0 .5rem">💡 ${t('Sẵn sàng áp dụng tiêu chí vào thực chiến?')}</h3>
          <p class="muted small" style="margin:0 0 1.2rem">${t('Áp dụng ngay: luyện viết Task 2 hoặc luyện nói với đồng hồ bấm giờ như khi thi.')}</p>
          <div class="row" style="justify-content:center;gap:.8rem;flex-wrap:wrap">
            <a href="#/write" class="btn primary" style="font-weight:700">✍️ ${t('Thực hành viết Task 2 ngay')}</a>
            <a href="#/speaking" class="btn" style="font-weight:700">🗣️ ${t('Luyện nói Speaking ngay')}</a>
            <a href="#/task1" class="btn ghost" style="font-weight:700">📈 ${t('Luyện Task 1 (biểu đồ)')}</a>
          </div>
        </div>
      </div>
    `;

    // Mobile layout adjustment
    if (innerWidth < 900) {
      const mg = $('#modelGrid');
      if (mg) mg.style.gridTemplateColumns = '1fr';
    }

    // Bind event handlers
    $$('#skillTabs button').forEach(btn => {
      btn.onclick = () => {
        curSkill = btn.dataset.skill;
        curModelBand = '6.5';
        renderPage();
      };
    });

    $$('#bandFilters button').forEach(btn => {
      btn.onclick = () => {
        curBandFilter = btn.dataset.band;
        renderPage();
      };
    });

    $$('#modelBandTabs button').forEach(btn => {
      btn.onclick = () => {
        curModelBand = btn.dataset.mband;
        renderPage();
      };
    });

    const copyBtn = $('#crCopy');
    if (copyBtn) {
      copyBtn.onclick = () => {
        const txt = isW ? curModel.essay : curModel.transcript;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(txt).then(() => {
            copyBtn.textContent = '✅';
            setTimeout(() => { copyBtn.textContent = '📋'; }, 1600);
          }).catch(() => {});
        }
      };
    }

    const ttsBtn = $('#crTts');
    if (ttsBtn) {
      ttsBtn.onclick = () => {
        const txt = curModel.transcript;
        if (typeof UI !== 'undefined' && UI.tts) UI.tts(txt, (typeof state !== 'undefined' && state.settings && state.settings.accent) || 'en-GB', 0.95);
      };
    }
  }

  // Khởi tạo route
  routes.criteria = App.guard(async function (arg, query) {
    const sk = arg || (query && query.get('skill')) || ''; // #/criteria/speaking hoặc #/criteria?skill=speaking
    if (sk === 'speaking' || sk === 'speak') curSkill = 'speaking';
    else if (sk === 'writing' || sk === 'write') curSkill = 'writing';
    renderPage();
  });

  App.Criteria = { DATA, renderPage };
})();
