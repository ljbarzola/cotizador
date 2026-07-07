import { doLogin, validateSession, logout } from './modules/auth.js';

// === CATÁLOGO === (se inserta aquí abajo)
const CATALOG = [{"code":"DS-2CE70DF0T-MFS","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision domo día/noche 4 en 1 1080P IR exterior ColorVU","cost":20.5,"pvp35":27.68,"pvp15":23.57,"lastUpdate":"2024-06-25","daysOld":694,"supplier":"Sisegusa","isService":false},{"code":"DS-2CE10DF0T-FS","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision tubo ext. 4 en 1 1080P IR 10-20 ColorVU","cost":23.93,"pvp35":32.31,"pvp15":27.52,"lastUpdate":"2023-08-30","daysOld":994,"supplier":"","isService":false},{"code":"DS-2CE72DF0T-F","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision domo día/noche 4 en 1 1080P IR exterior ColorVU","cost":24.12,"pvp35":32.56,"pvp15":27.74,"lastUpdate":"2023-02-28","daysOld":1177,"supplier":"","isService":false},{"code":"DS-2CE10DF0T-F","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision tubo ext. 4 en 1 1080P IR 10-20 ColorVU","cost":23.11,"pvp35":31.2,"pvp15":26.58,"lastUpdate":"2023-02-14","daysOld":1191,"supplier":"","isService":false},{"code":"DS-2CE16K0T-EXLF","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Tubo ext. HD-TVI 3K L 2.8mm IR 10-20 luz híbrida","cost":20.59,"pvp35":27.8,"pvp15":23.68,"lastUpdate":"2025-05-19","daysOld":366,"supplier":"","isService":false},{"code":"DS-2CE70KF0T-MFS","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision domo sellado HD-TVI 3K IR 10-20m exterior ColorVU","cost":38.84,"pvp35":52.43,"pvp15":44.67,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"DS-2CE10KF0T-FS","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision tubo sellado HD-TVI 3K IR 10-20m exterior ColorVU","cost":37.83,"pvp35":51.07,"pvp15":43.5,"lastUpdate":"2024-10-09","daysOld":588,"supplier":"Tech","isService":false},{"code":"DS-2CE72KF3TP-DLS","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara panorámica domo TurboHD 3K / IP67","cost":113.26,"pvp35":152.9,"pvp15":130.25,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CE12KF3TP-DLS","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara panorámica tubo TurboHD 3K / IP67","cost":113.26,"pvp35":152.9,"pvp15":130.25,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CE76U1T-ITPF","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision domo 8MP Turbo HD","cost":49.6,"pvp35":66.96,"pvp15":57.04,"lastUpdate":"2024-06-12","daysOld":707,"supplier":"Tech","isService":false},{"code":"DS-2CE19D0T-VFIT3F","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision tubo varifocal 2MP ext. IR 4 en 1 1080P 2.8-12mm","cost":45.7,"pvp35":61.7,"pvp15":52.55,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"DS-2AE4225TI-D","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision PTZ Speed Dome 25X HD-TVI c/IR 2MP","cost":234.67,"pvp35":316.8,"pvp15":269.87,"lastUpdate":"2025-06-24","daysOld":330,"supplier":"Sisegusa","isService":false},{"code":"DS-2CE16C0T-IRF","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision tubo sellado 4 en 1 720P IR 10-20m","cost":14.35,"pvp35":19.37,"pvp15":16.5,"lastUpdate":"2022-12-05","daysOld":1262,"supplier":"","isService":false},{"code":"DS-2CE56D0T-IRMF","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision domo dianoche exterior 4 en 1 1080P IR metálica","cost":18.76,"pvp35":25.33,"pvp15":21.57,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"DS-2CE16D0T-IRF","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision tubo ext. 4 en 1 1080P IR 10-20 metálica","cost":14.79,"pvp35":19.97,"pvp15":17.01,"lastUpdate":"2025-05-19","daysOld":366,"supplier":"","isService":false},{"code":"DS-2CE79H0T-IT3ZF","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision domo dianoche exterior 4 en 1 5MP 2.7-13.5mm IR","cost":58.56,"pvp35":79.06,"pvp15":67.34,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"DS-2CE19H0T-AIT3ZF","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision tubo ext. 4 en 1 5MP L 2.7-13.5mm IR","cost":69.14,"pvp35":93.34,"pvp15":79.51,"lastUpdate":"2024-10-09","daysOld":588,"supplier":"Tech","isService":false},{"code":"DS-2CE56C0T-IRF","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision domo D/N metal 4en1 720P IR 10-20m","cost":14.35,"pvp35":19.37,"pvp15":16.5,"lastUpdate":"2022-12-05","daysOld":1262,"supplier":"","isService":false},{"code":"(sin código)","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision domo D/N plástica 4en1 720P IR 10-20m","cost":11.1,"pvp35":14.99,"pvp15":12.76,"lastUpdate":"2022-12-15","daysOld":1252,"supplier":"","isService":false},{"code":"(sin código)","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara Hikvision tubo sellado ext. de 720P","cost":11.1,"pvp35":14.99,"pvp15":12.76,"lastUpdate":"2023-03-28","daysOld":1149,"supplier":"","isService":false},{"code":"DS-2CE12DF3T-PIRXOS","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara tubo sellado PIRXOS HD-TVI 1080P IR 10-20m ColorVU","cost":61.52,"pvp35":83.05,"pvp15":70.75,"lastUpdate":"2023-04-04","daysOld":1142,"supplier":"","isService":false},{"code":"DOMO DAHUA DH-HAC-ME1200EQN-L 2.8MM","category":"Cámaras análogas Hikvision (HD-TVI / 4 en 1 / Turbo HD)","description":"Cámara domo Dahua 2MP, ángulo 100° IR 30m","cost":30.0,"pvp35":40.5,"pvp15":34.5,"lastUpdate":"2023-03-17","daysOld":1160,"supplier":"","isService":false},{"code":"DS-2CD1047G2H-LIUF/SRB","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP tubo sellada con luz híbrida ColorVU 4MP L 2.8mm (con luz estrobo)","cost":67.07,"pvp35":90.54,"pvp15":77.13,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD1047G2-LUF","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision tubo sellada ColorVU 4MP L 2.8mm con micrófono","cost":76.0,"pvp35":102.6,"pvp15":87.4,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD1347G0-L","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision domo ColorVU 4MP L 2.8mm","cost":67.7,"pvp35":91.4,"pvp15":77.86,"lastUpdate":"2024-06-03","daysOld":716,"supplier":"Tech","isService":false},{"code":"DS-2CD1047G0-L","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision tubo sellada ColorVU 4MP L 2.8mm","cost":70.5,"pvp35":95.18,"pvp15":81.07,"lastUpdate":"2024-06-03","daysOld":716,"supplier":"Tech","isService":false},{"code":"DS-2CD1027G0-L","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision tubo sellada ColorVU 2MP L 2.8mm","cost":46.84,"pvp35":63.23,"pvp15":53.87,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"DS-2CD1327G0-L","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision domo turret ColorVU 2MP L 2.8mm","cost":45.54,"pvp35":61.48,"pvp15":52.37,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"DS-2CD1327G2-LUF","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision domo ColorVU 2MP L 2.8mm con micrófono","cost":53.4,"pvp35":72.09,"pvp15":61.41,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD1027G2-LUF","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision tubo sellada ColorVU 2MP L 2.8mm con micrófono","cost":53.4,"pvp35":72.09,"pvp15":61.41,"lastUpdate":"2024-06-03","daysOld":716,"supplier":"Tech","isService":false},{"code":"DS-2CD2T47G2-LSU/SL","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision tubo ColorVU 4MP L 2.8mm alarma activa (analítica cruce)","cost":135.0,"pvp35":182.25,"pvp15":155.25,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD1027G2H-LIU","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP tubo sellada ColorVU 2MP L 2.8mm con micrófono","cost":45.61,"pvp35":61.57,"pvp15":52.45,"lastUpdate":"2024-10-18","daysOld":579,"supplier":"Sisegusa","isService":false},{"code":"DS-2CD1047G2H-LIU","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP tubo sellada ColorVU 4MP L 2.8mm con micrófono","cost":76.0,"pvp35":102.6,"pvp15":87.4,"lastUpdate":"2024-10-18","daysOld":579,"supplier":"Sisegusa","isService":false},{"code":"DS-2CV2121G2-IDW","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision domo 2MP L 2.8mm WiFi c/audio","cost":75.1,"pvp35":101.39,"pvp15":86.36,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"Sisegusa","isService":false},{"code":"DS-2CV2Q21FD-IW(W)","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision PanTilt 2MP L 2.8mm WiFi","cost":43.09,"pvp35":58.17,"pvp15":49.55,"lastUpdate":null,"daysOld":null,"supplier":"Sisegusa","isService":false},{"code":"DS-2CV2U21FD-IW(W)","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision cubo 2MP D/N L 2.8mm WiFi 5VDC","cost":32.71,"pvp35":44.16,"pvp15":37.62,"lastUpdate":"2022-12-07","daysOld":1260,"supplier":"Sisegusa","isService":false},{"code":"DS-2CD2121G2-IWS","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP domo 2MP WiFi micrófono y altavoz (stock limitado)","cost":79.75,"pvp35":107.66,"pvp15":91.71,"lastUpdate":"2024-10-18","daysOld":579,"supplier":"Intcomex","isService":false},{"code":"DS-2CV1043G2-LIDWF","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámaras IP tubo 4MP WiFi micrófono y altavoz (stock limitado)","cost":46.5,"pvp35":62.78,"pvp15":53.47,"lastUpdate":"2024-10-18","daysOld":579,"supplier":"Intcomex","isService":false},{"code":"DS-2DE2C400MWG/W","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara PT 4MP audio y micrófono WiFi (stock limitado)","cost":58.29,"pvp35":78.69,"pvp15":67.03,"lastUpdate":"2024-10-18","daysOld":579,"supplier":"Intcomex","isService":false},{"code":"DS-2CD1143G2-LIU","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP domo luz híbrida 4MP L 2.8mm con micrófono","cost":53.06,"pvp35":71.63,"pvp15":61.02,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD1043G2-LIU","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP tubo sellada luz híbrida 4MP L 2.8mm con micrófono","cost":50.47,"pvp35":68.13,"pvp15":58.04,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD2143G2-IU","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision domo 4MP L 2.8mm H265+ AcuSense con micrófono","cost":91.88,"pvp35":124.04,"pvp15":105.66,"lastUpdate":"2025-10-01","daysOld":231,"supplier":"Sisegusa","isService":false},{"code":"DS-2CD2143G2-IS","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision domo 4MP L 2.8mm H265+ AcuSense audio in (analítica cruce)","cost":97.24,"pvp35":131.27,"pvp15":111.83,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD2043G2-IU","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision tubo exterior 4MP L 2.8mm con micrófono (analítica cruce)","cost":95.22,"pvp35":128.55,"pvp15":109.5,"lastUpdate":"2024-06-25","daysOld":694,"supplier":"Sisegusa","isService":false},{"code":"DS-2CD2043G2-LI2U","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision tubo exterior 4MP L 2.8mm c/micrófono (analítica cruce) — modelo nuevo","cost":105.71,"pvp35":142.71,"pvp15":121.57,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD2047G2H-LIU/SL","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara bala IP 4MP luz híbrida y captura facial (analítica cruce)","cost":137.54,"pvp35":185.68,"pvp15":158.17,"lastUpdate":"2024-09-23","daysOld":604,"supplier":"Tech","isService":false},{"code":"DS-2CD1643G0-IZ","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision tubo exterior 4MP varifocal L 2.8-12mm motorizado","cost":122.41,"pvp35":165.25,"pvp15":140.77,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"DS-2CD1743G0-IZ","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision domo 4MP varifocal L 2.8-12mm motorizado","cost":122.41,"pvp35":165.25,"pvp15":140.77,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"DS-2CD1743G2-LIZU","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP domo 4MP L 2.8-12mm varifocal motorizado c/audio dual light","cost":96.85,"pvp35":130.75,"pvp15":111.38,"lastUpdate":"2024-12-06","daysOld":530,"supplier":"Sisegusa","isService":false},{"code":"DS-2CD1723G0-IZ","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision domo 2MP L 2.8-12mm zoom motorizado","cost":106.61,"pvp35":143.92,"pvp15":122.6,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD1043G0-I","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision tubo exterior 4MP L 2.8mm","cost":58.2,"pvp35":78.57,"pvp15":66.93,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD1143G0-I","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision domo 4MP L 2.8mm","cost":58.25,"pvp35":78.64,"pvp15":66.99,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD1023G0E-I","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision tubo exterior 2MP L 2.8mm","cost":39.21,"pvp35":52.93,"pvp15":45.09,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD1123G0E-I","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision domo 2MP L 2.8mm","cost":42.0,"pvp35":56.7,"pvp15":48.3,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD2683G2-IZS","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision tubo ext. 8MP L 2.8-12mm","cost":231.8,"pvp35":312.93,"pvp15":266.57,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD1123G2-LIU","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision domo 2MP L 2.8mm","cost":49.94,"pvp35":67.42,"pvp15":57.43,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD1023G2-LIU","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP tubo sellada 2MP L 2.8mm c/micrófono dual light","cost":38.28,"pvp35":51.68,"pvp15":44.02,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD1123G2-LIU","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP domo luz híbrida 2MP L 2.8mm c/micrófono","cost":42.7,"pvp35":57.65,"pvp15":49.1,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD2643G2-IZS","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP tubo Hikvision ext. 4MP L 2.8-12mm (con salida audio)","cost":167.81,"pvp35":226.54,"pvp15":192.98,"lastUpdate":"2025-02-11","daysOld":463,"supplier":"Sisegusa","isService":false},{"code":"DS-2CD6365G1-IVS","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision ojo de pez 6MP L 1.16mm c/audio","cost":372.37,"pvp35":502.7,"pvp15":428.23,"lastUpdate":null,"daysOld":null,"supplier":"Sisegusa","isService":false},{"code":"DS-2CD63622F-IVS","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision ojo de pez 6MP","cost":401.5,"pvp35":542.03,"pvp15":461.72,"lastUpdate":null,"daysOld":null,"supplier":"Tech","isService":false},{"code":"DS-2CD2683G2-LIZS2U","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP tubo ext. 8MP L 2.8-12mm c/audio dual light","cost":214.1,"pvp35":289.04,"pvp15":246.21,"lastUpdate":"2025-02-11","daysOld":463,"supplier":"Sisegusa","isService":false},{"code":"DS-2CD2643G2-LIZS2U","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision tubo ext. 4MP L 2.8-12mm (con salida audio)","cost":154.85,"pvp35":209.05,"pvp15":178.08,"lastUpdate":null,"daysOld":null,"supplier":"Tech","isService":false},{"code":"DS-2CD2083G2-IU","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision tubo exterior 8MP L 2.8mm c/audio (analítica cruce)","cost":119.05,"pvp35":160.72,"pvp15":136.91,"lastUpdate":null,"daysOld":null,"supplier":"Sisegusa","isService":false},{"code":"DS-2XS2T41G1-ID/4G","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara Hikvision 4MP 3/4G con panel solar y batería (NO monitoreable con HikCentral)","cost":179.22,"pvp35":241.95,"pvp15":206.1,"lastUpdate":null,"daysOld":null,"supplier":"Sisegusa","isService":false},{"code":"DS-2XS2T47G1-LDH/4G/C18S40 (4mm)","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara Hikvision ColorVU 4MP 3/4G c/panel solar y batería","cost":1064.3,"pvp35":1436.81,"pvp15":1223.94,"lastUpdate":null,"daysOld":null,"supplier":"Tech","isService":false},{"code":"DS-2XS2T47G1-LDH/4G/C18S40 (6mm)","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara Hikvision ColorVU 4MP 3/4G c/panel solar y batería","cost":1064.3,"pvp35":1436.81,"pvp15":1223.94,"lastUpdate":null,"daysOld":null,"supplier":"Tech","isService":false},{"code":"DS-2CD2T87G2P-LSU/SL(4mm)","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Hikvision cámara red bala fija ColorVU panorámica 8MP (bajo importación)","cost":390.49,"pvp35":527.16,"pvp15":449.06,"lastUpdate":"2024-06-19","daysOld":700,"supplier":"Intcomex","isService":false},{"code":"DS-2CD7146G0-IZS","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision domo 4MP (analítica detección facial)","cost":397.2,"pvp35":536.22,"pvp15":456.78,"lastUpdate":"2023-05-08","daysOld":1108,"supplier":"Tech Resources","isService":false},{"code":"DS-2CD7A26G0-IZHS","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara IP Hikvision tubo varifocal-placas 2MP","cost":523.03,"pvp35":706.09,"pvp15":601.48,"lastUpdate":"2023-10-18","daysOld":945,"supplier":"Tech Resources","isService":false},{"code":"iDS-2CD7A26G0/P-IZHS","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara tubo Hikvision varifocal - placas 2MP","cost":444.15,"pvp35":599.6,"pvp15":510.77,"lastUpdate":"2024-08-16","daysOld":642,"supplier":"Tech Resources","isService":false},{"code":"IDS-2CD7A46G0/P-IZHS","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara tubo Hikvision varifocal DeepInView - placas 4MP","cost":459.95,"pvp35":620.93,"pvp15":528.94,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2CD7146G2-IZS","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara domo IP 4MP / lente motorizado 2.8-12mm / reconocimiento facial IK10 (conteo personas)","cost":552.74,"pvp35":746.2,"pvp15":635.65,"lastUpdate":"2025-02-12","daysOld":462,"supplier":"Macroquil","isService":false},{"code":"DS-2CD3746G2-IZS","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara red domo varifocal AcuSense 4MP (conteo personas)","cost":288.64,"pvp35":389.66,"pvp15":331.94,"lastUpdate":"2025-02-12","daysOld":462,"supplier":"Macroquil","isService":false},{"code":"DS-2DE2A404IW-DE3(S6)","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara Speed Dome Hikvision 4MP 4X","cost":142.5,"pvp35":192.38,"pvp15":163.88,"lastUpdate":"2023-08-08","daysOld":1016,"supplier":"Sisegusa","isService":false},{"code":"DS-IDS-2CD7A46G0-IZHSY","category":"Cámaras IP Hikvision (ColorVU, AcuSense, DeepInView)","description":"Cámara bullet Hikvision 4MP lente 2.8-12mm DeepInView (detección facial)","cost":578.45,"pvp35":780.91,"pvp15":665.22,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2DE2C400IWG-K/4GB/C09S20","category":"Cámaras con batería + panel solar (Hikvision, EZVIZ)","description":"Cámara PT 4MP con panel solar y batería","cost":179.0,"pvp35":241.65,"pvp15":205.85,"lastUpdate":"2025-08-14","daysOld":279,"supplier":"Sisegusa","isService":false},{"code":"CS-EB8/SP-R100","category":"Cámaras con batería + panel solar (Hikvision, EZVIZ)","description":"EZVIZ EB8 cámara IP exterior con batería 3MP 4G + panel","cost":158.13,"pvp35":213.48,"pvp15":181.85,"lastUpdate":"2025-08-15","daysOld":278,"supplier":"","isService":false},{"code":"CS-EB3-R200-1K3 WFL","category":"Cámaras con batería + panel solar (Hikvision, EZVIZ)","description":"EZVIZ EB3 cámara IP exterior con batería 3MP L 2mm","cost":83.17,"pvp35":112.28,"pvp15":95.65,"lastUpdate":"2025-08-16","daysOld":277,"supplier":"Tech","isService":false},{"code":"CS-HB8-R100-2C4 WDL","category":"Cámaras con batería + panel solar (Hikvision, EZVIZ)","description":"EZVIZ HB8 PanTilt exterior 2K a batería L 4mm","cost":132.0,"pvp35":178.2,"pvp15":151.8,"lastUpdate":"2025-08-17","daysOld":276,"supplier":"","isService":false},{"code":"CS-CMT-SOLARPANEL-C","category":"Cámaras con batería + panel solar (Hikvision, EZVIZ)","description":"Panel solar para cámara EZVIZ","cost":20.63,"pvp35":27.85,"pvp15":23.72,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"CS-EB5-R100-2F8WFL","category":"Cámaras con batería + panel solar (Hikvision, EZVIZ)","description":"EZVIZ EB5 cámara exterior con batería 8MP integrado panel solar","cost":104.0,"pvp35":140.4,"pvp15":119.6,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"CS-EB3-R100-2C3WFL","category":"Cámaras con batería + panel solar (Hikvision, EZVIZ)","description":"EZVIZ EB3 cámara IP exterior con batería 3MP L 2.8mm","cost":96.3,"pvp35":130.01,"pvp15":110.74,"lastUpdate":"2023-06-12","daysOld":1073,"supplier":"Sisegusa","isService":false},{"code":"CS-BC1C-B0-2C2WPBDL","category":"Cámaras con batería + panel solar (Hikvision, EZVIZ)","description":"EZVIZ BC1C 1080P cámara IP c/batería 2MP L 2.8mm (DESCONTINUADA — reemplaza por EB3)","cost":96.38,"pvp35":130.11,"pvp15":110.84,"lastUpdate":"2023-02-17","daysOld":1188,"supplier":"","isService":false},{"code":"CS-BC2-A0-2C2WPFB","category":"Cámaras con batería + panel solar (Hikvision, EZVIZ)","description":"EZVIZ BC2 1080P cámara interior IP c/batería 2MP","cost":69.0,"pvp35":93.15,"pvp15":79.35,"lastUpdate":"2023-02-17","daysOld":1188,"supplier":"","isService":false},{"code":"CS-C3TN-A0-1H3WKFL","category":"EZVIZ línea hogar","description":"EZVIZ C3TN cámara IP tubo sellada 3MP L 2.8mm","cost":47.29,"pvp35":63.84,"pvp15":54.38,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"CS-C8C-A0-1F2WF","category":"EZVIZ línea hogar","description":"EZVIZ C8C 2MP PanTilt exterior L 4mm (DESCONTINUADA — reemplaza por H8C)","cost":54.47,"pvp35":73.53,"pvp15":62.64,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"CS-C6N-R101-1G2WF","category":"EZVIZ línea hogar","description":"EZVIZ C6N cámara IP PanTilt 2MP L 2.8mm (DESCONTINUADA — reemplaza por H6C)","cost":28.94,"pvp35":39.07,"pvp15":33.28,"lastUpdate":"2023-02-17","daysOld":1188,"supplier":"","isService":false},{"code":"","category":"EZVIZ línea hogar","description":"EZVIZ H1C mini cámara 1080P IP 2MP","cost":24.0,"pvp35":32.4,"pvp15":27.6,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"CS-H6C-R105-1L2WF","category":"EZVIZ línea hogar","description":"EZVIZ H6C 2MP cámara IP PanTilt 2MP L 4mm","cost":28.94,"pvp35":39.07,"pvp15":33.28,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"CS-C3W-A0-1F4WFL","category":"EZVIZ línea hogar","description":"EZVIZ C3W cámara IP tubo sellada color nightvision 4MP","cost":79.06,"pvp35":106.73,"pvp15":90.92,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"CS-C6W-A0-3H4WF","category":"EZVIZ línea hogar","description":"EZVIZ C6W cámara IP PanTilt 4MP L 2.8mm","cost":69.9,"pvp35":94.37,"pvp15":80.39,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"CS-C2C-B0-1E2WF","category":"EZVIZ línea hogar","description":"EZVIZ C2C mini O plus cámara IP 1080P L 2.8mm (reemplaza H1C)","cost":25.4,"pvp35":34.29,"pvp15":29.21,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"CS-C3TN-A0-1H2WF","category":"EZVIZ línea hogar","description":"EZVIZ C3TN cámara IP tubo sellada 2MP L 2.8mm","cost":38.82,"pvp35":52.41,"pvp15":44.64,"lastUpdate":"2022-12-08","daysOld":1259,"supplier":"","isService":false},{"code":"CS-H3-R100-1H3WKFL","category":"EZVIZ línea hogar","description":"EZVIZ H3 3MP cámara IP tubo sellada","cost":53.45,"pvp35":72.16,"pvp15":61.47,"lastUpdate":"2024-09-02","daysOld":625,"supplier":"Tech","isService":false},{"code":"CS-C6-A0-8C4WF","category":"EZVIZ línea hogar","description":"EZVIZ C6 2K PanTilt L 4mm","cost":75.07,"pvp35":101.34,"pvp15":86.33,"lastUpdate":"2023-02-17","daysOld":1188,"supplier":"","isService":false},{"code":"CS-C6N-D0-8B4WF","category":"EZVIZ línea hogar","description":"EZVIZ C6N 4MP PanTilt L 2.8mm","cost":27.5,"pvp35":37.13,"pvp15":31.62,"lastUpdate":"2023-03-30","daysOld":1147,"supplier":"","isService":false},{"code":"CS-H8C-R100-1K2WKFL","category":"EZVIZ línea hogar","description":"EZVIZ H8C 1080P PanTilt exterior L 4mm","cost":46.86,"pvp35":63.26,"pvp15":53.89,"lastUpdate":"2023-06-08","daysOld":1077,"supplier":"Sisegusa","isService":false},{"code":"CS-HB8-R100-2C4WDL","category":"EZVIZ línea hogar","description":"EZVIZ HB8 PanTilt exterior 2K a batería L 4mm","cost":153.0,"pvp35":206.55,"pvp15":175.95,"lastUpdate":"2023-06-12","daysOld":1073,"supplier":"Sisegusa","isService":false},{"code":"DS-2DE7A232IW-AEB(T5)","category":"PTZ IP / DarkFighter / Speed Dome","description":"Cámara IP Speed Dome 2MP con IR 32X HK","cost":633.35,"pvp35":855.02,"pvp15":728.35,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"FT-CAMPTZ","category":"PTZ IP / DarkFighter / Speed Dome","description":"Transformador para domo PTZ 24VAC 2500mA","cost":11.84,"pvp35":15.98,"pvp15":13.62,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2DF8C435MHS-DELW","category":"PTZ IP / DarkFighter / Speed Dome","description":"Cámara PTZ 8\" 4MP 35X DarkFighterX IR Network Speed Dome","cost":1785.45,"pvp35":2410.36,"pvp15":2053.27,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2DE7A432IW-AEB(T5)","category":"PTZ IP / DarkFighter / Speed Dome","description":"Cámara PTZ DarkFighter IR 7\" 4MP 32X","cost":514.79,"pvp35":694.97,"pvp15":592.01,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2DE4225IW-DE (T5)","category":"PTZ IP / DarkFighter / Speed Dome","description":"Cámara Speed Dome 2MP 25X","cost":282.5,"pvp35":381.38,"pvp15":324.88,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2DP1618ZIXS-D/440","category":"PTZ IP / DarkFighter / Speed Dome","description":"Cámara panorámica y PTZ 16MP 180° (bajo importación)","cost":4401.48,"pvp35":5941.99,"pvp15":5061.7,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2DP0818ZIXS-DE/440","category":"PTZ IP / DarkFighter / Speed Dome","description":"Cámara panorámica y PTZ 8MP 180° (bajo importación)","cost":4308.48,"pvp35":5816.45,"pvp15":4954.75,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2TD2637-15/QY(O-STD)","category":"Cámaras térmicas (Hikvision — para camaroneras / industriales)","description":"Cámara térmica fija Bi-spectro Hikvision 15mm","cost":1862.97,"pvp35":2515.01,"pvp15":2142.42,"lastUpdate":"2024-10-16","daysOld":581,"supplier":"","isService":false},{"code":"DS-2TD2637-25/QY(O-STD)","category":"Cámaras térmicas (Hikvision — para camaroneras / industriales)","description":"Cámara térmica fija Bi-spectro Hikvision 25mm","cost":2043.72,"pvp35":2759.02,"pvp15":2350.28,"lastUpdate":"2024-10-16","daysOld":581,"supplier":"","isService":false},{"code":"DS-2TD2637-35/QY(O-STD)(B)","category":"Cámaras térmicas (Hikvision — para camaroneras / industriales)","description":"Cámara térmica fija Bi-spectro Hikvision 35mm","cost":2343.58,"pvp35":3163.83,"pvp15":2695.12,"lastUpdate":"2024-10-16","daysOld":581,"supplier":"","isService":false},{"code":"DS-2TD2637-35/QY","category":"Cámaras térmicas (Hikvision — para camaroneras / industriales)","description":"Cámara térmica fija Bi-spectro Hikvision 35mm","cost":2932.0,"pvp35":3958.2,"pvp15":3371.8,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2TD2836-50/V1","category":"Cámaras térmicas (Hikvision — para camaroneras / industriales)","description":"Cámara térmica fija Bi-spectro Hikvision 50mm","cost":4358.75,"pvp35":5884.31,"pvp15":5012.56,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2TD2367-75/PY","category":"Cámaras térmicas (Hikvision — para camaroneras / industriales)","description":"Cámara térmica fija Bi-spectro Hikvision 75mm","cost":5100.1,"pvp35":6885.14,"pvp15":5865.11,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2TD2367-75/PY(O-STD)","category":"Cámaras térmicas (Hikvision — para camaroneras / industriales)","description":"Cámara térmica fija Bi-spectro Hikvision 75mm","cost":4300.93,"pvp35":5806.26,"pvp15":4946.07,"lastUpdate":"2024-10-16","daysOld":581,"supplier":"","isService":false},{"code":"DS-2TD2137-10/VP","category":"Cámaras térmicas (Hikvision — para camaroneras / industriales)","description":"Cámara bullet térmica 10mm","cost":1787.91,"pvp35":2413.68,"pvp15":2056.1,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2TD2167-35/P","category":"Cámaras térmicas (Hikvision — para camaroneras / industriales)","description":"Cámara bullet térmica 35mm","cost":4025.0,"pvp35":5433.75,"pvp15":4628.75,"lastUpdate":"2022-12-22","daysOld":1245,"supplier":"","isService":false},{"code":"DS-2TD2367-75/P","category":"Cámaras térmicas (Hikvision — para camaroneras / industriales)","description":"Cámara bullet térmica 75mm","cost":4580.0,"pvp35":6183.0,"pvp15":5267.0,"lastUpdate":"2022-12-22","daysOld":1245,"supplier":"","isService":false},{"code":"DS-2TD2367-50/P","category":"Cámaras térmicas (Hikvision — para camaroneras / industriales)","description":"Cámara bullet térmica 50mm","cost":4199.0,"pvp35":5668.65,"pvp15":4828.85,"lastUpdate":"2022-12-22","daysOld":1245,"supplier":"","isService":false},{"code":"DS-2TD2367-100/P","category":"Cámaras térmicas (Hikvision — para camaroneras / industriales)","description":"Cámara bullet térmica 100mm","cost":5635.4,"pvp35":7607.79,"pvp15":6480.71,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2TD6267-50H4L/W","category":"Cámaras térmicas (Hikvision — para camaroneras / industriales)","description":"Cámara térmica posicionadora 50mm","cost":10050.68,"pvp35":13568.42,"pvp15":11558.28,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2TD6267-75C4L/W","category":"Cámaras térmicas (Hikvision — para camaroneras / industriales)","description":"Cámara térmica posicionadora 75mm","cost":11723.57,"pvp35":15826.82,"pvp15":13482.11,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2PA2408-PWA(US)","category":"Cámaras térmicas (Hikvision — para camaroneras / industriales)","description":"Fuente de poder PTZ Position 24V 8A","cost":75.0,"pvp35":101.25,"pvp15":86.25,"lastUpdate":"2023-03-09","daysOld":1168,"supplier":"","isService":false},{"code":"DS-2TD4137-25/W(O-STD)","category":"PTZ térmicas","description":"Cámara domo Thermal & Optical Bi-spectrum 25mm","cost":3933.92,"pvp35":5310.79,"pvp15":4524.01,"lastUpdate":"2023-03-09","daysOld":1168,"supplier":"","isService":false},{"code":"DS-2TD4137-50W","category":"PTZ térmicas","description":"Cámara domo Thermal & Optical Bi-spectrum 50mm","cost":5208.48,"pvp35":7031.45,"pvp15":5989.75,"lastUpdate":"2023-02-03","daysOld":1202,"supplier":"","isService":false},{"code":"DS-2TD6267-50H4L/W","category":"PTZ térmicas","description":"Cámara position / óptico 56X / térmico 50mm fijo / láser 800m","cost":9768.17,"pvp35":13187.03,"pvp15":11233.4,"lastUpdate":"2023-03-03","daysOld":1174,"supplier":"","isService":false},{"code":"DS-2TD6267-75C4L/WY","category":"PTZ térmicas","description":"Cámara position / óptico 56X / térmico 75mm fijo / láser 800m","cost":12616.44,"pvp35":17032.19,"pvp15":14508.91,"lastUpdate":"2022-12-22","daysOld":1245,"supplier":"","isService":false},{"code":"DS-2TD6237-75C4L/W","category":"PTZ térmicas","description":"Thermal & Optical Bi-spectrum Network Positioning System","cost":8872.69,"pvp35":11978.13,"pvp15":10203.59,"lastUpdate":"2023-06-06","daysOld":1079,"supplier":"","isService":false},{"code":"DS-2TD8166-150ZE2F/V2","category":"PTZ térmicas","description":"Cámara position / óptico 49X / térmico 150mm VFM","cost":52094.0,"pvp35":70326.9,"pvp15":59908.1,"lastUpdate":"2022-12-22","daysOld":1245,"supplier":"","isService":false},{"code":"DS-2TD8166-150ZH2F/V2","category":"PTZ térmicas","description":"Cámara position / óptico 49X / térmico 150mm VFM","cost":30870.0,"pvp35":41674.5,"pvp15":35500.5,"lastUpdate":"2022-12-22","daysOld":1245,"supplier":"","isService":false},{"code":"DS-2TD8166-100C2F/V2","category":"PTZ térmicas","description":"Cámara position / óptico 49X / térmico 100mm fijo","cost":27011.0,"pvp35":36464.85,"pvp15":31062.65,"lastUpdate":"2022-12-22","daysOld":1245,"supplier":"","isService":false},{"code":"DHI-TPC-SD5441-B35Z45","category":"PTZ térmicas","description":"DAHUA domo velocidad híbrida térmica 4MP / térmico 35mm / 45X óptico / IP66","cost":4500.74,"pvp35":6076.0,"pvp15":5175.85,"lastUpdate":"2023-03-03","daysOld":1174,"supplier":"","isService":false},{"code":"DS-2TD2608-2/QA","category":"Térmicas IP HeatPro","description":"Cámara IP tubo térmica 2.6mm dual óptico ColorVU 4MP 6mm","cost":198.78,"pvp35":268.35,"pvp15":228.6,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2TD2617-10/QA","category":"Térmicas IP HeatPro","description":"Cámara IP tubo térmica 10mm dual óptico 4MP 8mm","cost":286.0,"pvp35":386.1,"pvp15":328.9,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2TD4228-10/S2","category":"Térmicas IP HeatPro","description":"Cámara PTZ IP térmica 10mm, 32X zoom 4MP","cost":1067.94,"pvp35":1441.72,"pvp15":1228.13,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-2PA2408","category":"Térmicas IP HeatPro","description":"Fuente para PTZ HeatPro","cost":59.62,"pvp35":80.49,"pvp15":68.56,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-PA0103-B","category":"Térmicas IP HeatPro","description":"Parlante IP Hikvision","cost":374.03,"pvp35":504.94,"pvp15":430.13,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-7204HQHI-M1/S","category":"DVR Hikvision / HikLook","description":"Grabador digital Hikvision 4CH HD-TVI 1HDD 1080P AcuSense con audio","cost":63.36,"pvp35":85.54,"pvp15":72.86,"lastUpdate":"2023-03-01","daysOld":1176,"supplier":"","isService":false},{"code":"iDS-7208HUHI-M1/S/A","category":"DVR Hikvision / HikLook","description":"Grabador digital AcuSense Hikvision 8CH Turbo HD 4.0 1HDD audio y alarma","cost":161.41,"pvp35":217.9,"pvp15":185.62,"lastUpdate":"2024-01-08","daysOld":863,"supplier":"","isService":false},{"code":"DS-7216HQHI-M2/S","category":"DVR Hikvision / HikLook","description":"Grabador digital Hikvision 16CH Turbo HD 4.0 AcuSense 2HDD","cost":165.68,"pvp35":223.67,"pvp15":190.53,"lastUpdate":"2024-06-26","daysOld":693,"supplier":"Sisegusa","isService":false},{"code":"DS-7216HUHI-M2/S/A","category":"DVR Hikvision / HikLook","description":"Grabador digital profesional Hikvision AcuSense 16CH Turbo HD 4.0 2HDD audio y alarma","cost":323.83,"pvp35":437.17,"pvp15":372.4,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"iDS-7216HUHI-M2/S","category":"DVR Hikvision / HikLook","description":"Grabador digital 16CH Hikvision Turbo HD 4.0 2HDD 8MP AcuSense audio y alarma","cost":299.1,"pvp35":403.79,"pvp15":343.96,"lastUpdate":"2024-06-12","daysOld":707,"supplier":"Tech","isService":false},{"code":"DS-7208HGHI-M1(C)","category":"DVR Hikvision / HikLook","description":"Grabador económico Hikvision 8CH HD-TVI con audio","cost":50.03,"pvp35":67.54,"pvp15":57.53,"lastUpdate":"2023-12-01","daysOld":901,"supplier":"","isService":false},{"code":"DS-7104HGHI-M1(C)","category":"DVR Hikvision / HikLook","description":"Grabador económico Hikvision 4CH HD-TVI audio","cost":35.19,"pvp35":47.51,"pvp15":40.47,"lastUpdate":"2022-12-05","daysOld":1262,"supplier":"","isService":false},{"code":"IDS-7204HQHI-M1-FA","category":"DVR Hikvision / HikLook","description":"Grabador digital profesional Hikvision AcuSense 4CH HD-TVI audio","cost":105.0,"pvp35":141.75,"pvp15":120.75,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"iDS-7204HUHI-M1/S","category":"DVR Hikvision / HikLook","description":"4-ch 5MP 1U H.265 AcuSense DVR Hikvision","cost":100.0,"pvp35":135.0,"pvp15":115.0,"lastUpdate":"2023-02-14","daysOld":1191,"supplier":"","isService":false},{"code":"DS-E04HGHI-B","category":"DVR Hikvision / HikLook","description":"Grabador económico Hikvision 4CH con disco duro interno 300GB","cost":73.79,"pvp35":99.62,"pvp15":84.86,"lastUpdate":"2023-03-02","daysOld":1175,"supplier":"","isService":false},{"code":"DS-E08HGHI-B","category":"DVR Hikvision / HikLook","description":"Grabador económico 8CH Hikvision con disco duro interno 480GB","cost":76.8,"pvp35":103.68,"pvp15":88.32,"lastUpdate":"2023-04-04","daysOld":1142,"supplier":"","isService":false},{"code":"iDS-7332HQHI-M4/S","category":"DVR Hikvision / HikLook","description":"DVR 32 canales Hikvision 1080P","cost":611.8,"pvp35":825.93,"pvp15":703.57,"lastUpdate":"2023-05-06","daysOld":1110,"supplier":"Tech Resources","isService":false},{"code":"iDS-7332HUHI-M4/S","category":"DVR Hikvision / HikLook","description":"DVR 32 canales Hikvision 5MP","cost":1100.0,"pvp35":1485.0,"pvp15":1265.0,"lastUpdate":"2023-05-06","daysOld":1110,"supplier":"Tech Resources","isService":false},{"code":"DS-IDS-7204HQHI-M1/XT","category":"DVR Hikvision / HikLook","description":"Grabador digital 4CH HD-TVI 1HDD 1080P AcuSense audio (reconocimiento facial)","cost":55.1,"pvp35":74.39,"pvp15":63.36,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-IDS-7204HUHI-M1/X","category":"DVR Hikvision / HikLook","description":"Grabador digital 4CH HD-TVI 1HDD 4K audio y alarma (reconocimiento facial)","cost":97.97,"pvp35":132.26,"pvp15":112.67,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-IDS-7216HQHI-M2/XT","category":"DVR Hikvision / HikLook","description":"Grabador digital 16CH Turbo HD 4.0 AcuSense 2HDD 1080P audio (reconocimiento facial)","cost":164.4,"pvp35":221.94,"pvp15":189.06,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"THC-B120-MS","category":"DVR Hikvision / HikLook","description":"Cámara tubo 1080P audio HikLook","cost":16.8,"pvp35":22.68,"pvp15":19.32,"lastUpdate":"2025-01-24","daysOld":481,"supplier":"Tech","isService":false},{"code":"DVR-204Q-M1","category":"DVR Hikvision / HikLook","description":"DVR 4 canales 1080P HikLook","cost":52.65,"pvp35":71.08,"pvp15":60.55,"lastUpdate":"2025-01-24","daysOld":481,"supplier":"Tech","isService":false},{"code":"DS-7716NI-I4","category":"NVR Hikvision","description":"NVR 16CH / 4HDD","cost":402.75,"pvp35":543.71,"pvp15":463.16,"lastUpdate":"2022-12-22","daysOld":1245,"supplier":"","isService":false},{"code":"DS-9632NI-I8","category":"NVR Hikvision","description":"NVR de 32CH 8HDD 320/256MBPS 4K","cost":1056.84,"pvp35":1426.73,"pvp15":1215.37,"lastUpdate":"2022-11-15","daysOld":1282,"supplier":"","isService":false},{"code":"DS-9632NI-M8","category":"NVR Hikvision","description":"NVR de 32CH 8HDD 320/400MBPS 4K","cost":1010.98,"pvp35":1364.82,"pvp15":1162.63,"lastUpdate":"2024-11-07","daysOld":559,"supplier":"","isService":false},{"code":"DS-7732NI-K4","category":"NVR Hikvision","description":"NVR Hikvision 32CH capacidad 256MB bandeja 4HDD","cost":284.86,"pvp35":384.56,"pvp15":327.59,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-7732NXI-K4","category":"NVR Hikvision","description":"NVR Hikvision 32CH 1.5U K Series AcuSense","cost":326.0,"pvp35":440.1,"pvp15":374.9,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-7732NXI-I4/S","category":"NVR Hikvision","description":"NVR Hikvision 32CH bandeja 4HDD con 16CH AcuSense 256MB","cost":546.19,"pvp35":737.36,"pvp15":628.12,"lastUpdate":"2024-05-23","daysOld":727,"supplier":"","isService":false},{"code":"DS-7732NI-K4/16P","category":"NVR Hikvision","description":"NVR Hikvision 32CH bandeja 4HDD con 16CH POE","cost":427.68,"pvp35":577.37,"pvp15":491.83,"lastUpdate":"2024-05-23","daysOld":727,"supplier":"","isService":false},{"code":"DS-7616NXI-I2/S","category":"NVR Hikvision","description":"NVR Hikvision 16CH capacidad 160MB 2HDD (analítica placas)","cost":259.08,"pvp35":349.76,"pvp15":297.94,"lastUpdate":"2024-06-25","daysOld":694,"supplier":"","isService":false},{"code":"DS-7616NXI-K2","category":"NVR Hikvision","description":"NVR 4K Hikvision 16CH 1U K Series AcuSense","cost":155.62,"pvp35":210.09,"pvp15":178.96,"lastUpdate":"2025-05-28","daysOld":357,"supplier":"","isService":false},{"code":"DS-7616NI-K2/16P","category":"NVR Hikvision","description":"NVR Hikvision 16CH capacidad 40MB 2HDD 16 POE (monitoreo)","cost":290.24,"pvp35":391.82,"pvp15":333.78,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"DS-7616NI-I2","category":"NVR Hikvision","description":"NVR Hikvision 16CH capacidad 40MB 2HDD 16","cost":295.24,"pvp35":398.57,"pvp15":339.53,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-7616NI-Q2/16P SERIE SIMPLE","category":"NVR Hikvision","description":"NVR Hikvision 16CH capacidad 40MB POE","cost":221.1,"pvp35":298.49,"pvp15":254.26,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-7616NI-Q2 SERIE SIMPLE","category":"NVR Hikvision","description":"NVR Hikvision 16CH capacidad 40MB 2HDD 16","cost":113.61,"pvp35":153.37,"pvp15":130.65,"lastUpdate":"2022-12-02","daysOld":1265,"supplier":"","isService":false},{"code":"iDS7716NXI-M4/X","category":"NVR Hikvision","description":"NVR Hikvision DeepinMind 16CH 1.5U 8K","cost":1052.8,"pvp35":1421.28,"pvp15":1210.72,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"iDS-6716NXI-M1/AI(B)","category":"NVR Hikvision","description":"NVS DeepinMind con analítica avanzada de IA","cost":1568.96,"pvp35":2118.1,"pvp15":1804.3,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-7608NI-Q1/8P SERIE SIMPLE","category":"NVR Hikvision","description":"NVR Hikvision 8CH capacidad 40MB 8 puertos POE bandeja","cost":138.67,"pvp35":187.2,"pvp15":159.47,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"DS-7608NXI-K1","category":"NVR Hikvision","description":"NVR Hikvision 8CH capacidad 80MB bandeja 1HDD AcuSense","cost":79.51,"pvp35":107.34,"pvp15":91.44,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"DS-7608NI-K1","category":"NVR Hikvision","description":"NVR Hikvision 8CH capacidad 40MB bandeja 1HDD","cost":92.63,"pvp35":125.05,"pvp15":106.52,"lastUpdate":"2022-12-02","daysOld":1265,"supplier":"","isService":false},{"code":"DS-7608NI-I2","category":"NVR Hikvision","description":"NVR Hikvision 4K 1U de 8CH (analítica placas)","cost":224.29,"pvp35":302.79,"pvp15":257.93,"lastUpdate":"2024-08-16","daysOld":642,"supplier":"Tech","isService":false},{"code":"DS-7108NI-Q1","category":"NVR Hikvision","description":"NVR 8CH capacidad 40MB 1HDD","cost":52.56,"pvp35":70.96,"pvp15":60.44,"lastUpdate":"2025-03-07","daysOld":439,"supplier":"Sisegusa","isService":false},{"code":"HDD-10TB-DVRWD","category":"Discos duros","description":"Disco duro 10TB WD Purple (especial DVR)","cost":328.35,"pvp35":443.27,"pvp15":377.6,"lastUpdate":"2022-12-22","daysOld":1245,"supplier":"","isService":false},{"code":"HDD-4TB-WDP","category":"Discos duros","description":"Disco duro 4TB WD Purple (especial DVR)","cost":79.78,"pvp35":107.7,"pvp15":91.75,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"HDD-6TB-WDP","category":"Discos duros","description":"Disco duro 6TB WD Purple (especial DVR)","cost":153.98,"pvp35":207.87,"pvp15":177.08,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"HDD-2TB-WDP","category":"Discos duros","description":"Disco duro 2TB WD Purple (especial DVR)","cost":61.15,"pvp35":82.55,"pvp15":70.32,"lastUpdate":"2024-06-26","daysOld":693,"supplier":"Sisegusa","isService":false},{"code":"HDD-1TB-WDP","category":"Discos duros","description":"Disco duro 1TB WD Purple (especial DVR)","cost":45.33,"pvp35":61.2,"pvp15":52.13,"lastUpdate":"2022-12-05","daysOld":1262,"supplier":"","isService":false},{"code":"UTP-SF6P-FHM","category":"Switches y red activa","description":"Switch 4 puertos 10/100Mb POE + 2 uplink 10/100Mb","cost":39.68,"pvp35":53.57,"pvp15":45.63,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"UTP-SF10P-FHM","category":"Switches y red activa","description":"Switch 8 puertos 10/100Mb POE + 2 uplink 10/100Mb","cost":57.06,"pvp35":77.03,"pvp15":65.62,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"UTP-7216E-POE-L2","category":"Switches y red activa","description":"Switch 16 puertos POE administrable","cost":320.78,"pvp35":433.05,"pvp15":368.9,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-3E1505P-EI/M","category":"Switches y red activa","description":"Switch POE 4CH 10/100/1000Mb + 1 10/100Mb 45W","cost":30.0,"pvp35":40.5,"pvp15":34.5,"lastUpdate":"2024-05-30","daysOld":720,"supplier":"","isService":false},{"code":"DS-3E1510P-EI/M","category":"Switches y red activa","description":"Switch POE 8CH 10/100/1000Mb + 2 10/100/1000Mb 110W","cost":55.61,"pvp35":75.07,"pvp15":63.95,"lastUpdate":"2024-05-30","daysOld":720,"supplier":"","isService":false},{"code":"DS-3E0518P-E","category":"Switches y red activa","description":"Switch POE 16CH 10/100/1000Mb + 1 10/100/1000Mb + 1 fibra gigabit","cost":197.47,"pvp35":266.58,"pvp15":227.09,"lastUpdate":"2024-05-30","daysOld":720,"supplier":"Sisegusa","isService":false},{"code":"DS-3E1318P-EI","category":"Switches y red activa","description":"Switch POE 16CH 10/100/1000Mb + 1 10/100/1000Mb + 1 fibra gigabit","cost":170.8,"pvp35":230.58,"pvp15":196.42,"lastUpdate":null,"daysOld":null,"supplier":"Tech","isService":false},{"code":"DS-3E0505P-E/M","category":"Switches y red activa","description":"SW de 4 puertos","cost":30.4,"pvp35":41.04,"pvp15":34.96,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"TP-TL-SG1024","category":"Switches y red activa","description":"Switch TP-Link 24 puertos Gigabit no-administrable rackeable","cost":83.06,"pvp35":112.13,"pvp15":95.52,"lastUpdate":"2024-09-16","daysOld":611,"supplier":"","isService":false},{"code":"DS-3WR15X","category":"Switches y red activa","description":"Router WiFi 6 doble banda Gigabit 4 antenas","cost":33.84,"pvp35":45.68,"pvp15":38.92,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-3WR12GC","category":"Switches y red activa","description":"Router WiFi 5 doble banda Gigabit 4 antenas","cost":24.64,"pvp35":33.26,"pvp15":28.34,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"LOCOM2","category":"Switches y red activa","description":"Ubiquiti NanoStation LocoM2 8dBi AirMAX AP 2.4GHz MIMO outdoor (incluye PoE)","cost":68.95,"pvp35":93.08,"pvp15":79.29,"lastUpdate":"2022-12-02","daysOld":1265,"supplier":"","isService":false},{"code":"NBE-5AC-GEN2","category":"Switches y red activa","description":"Ubiquiti NanoBeam AC GEN2 NBE-5AC-GEN2","cost":107.0,"pvp35":144.45,"pvp15":123.05,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"TP-RE200","category":"Switches y red activa","description":"Extensor de señal WiFi de pared 2.4 y 5GHz","cost":22.26,"pvp35":30.05,"pvp15":25.6,"lastUpdate":"2022-12-02","daysOld":1265,"supplier":"","isService":false},{"code":"","category":"Switches y red activa","description":"PTP CPE 5GHz con antena integrada 24.5 dBi","cost":50.0,"pvp35":67.5,"pvp15":57.5,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-PWA64-KIT-WB","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Kit central alarma inalámbrica GPRS/WiFi (1 central + 1 contacto magnético + 1 detector + 1 control)","cost":119.28,"pvp35":161.03,"pvp15":137.17,"lastUpdate":"2025-05-20","daysOld":365,"supplier":"","isService":false},{"code":"DS-PS1-I-WB","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Sirena inalámbrica Hikvision 2ª generación","cost":32.53,"pvp35":43.92,"pvp15":37.41,"lastUpdate":"2025-05-20","daysOld":365,"supplier":"","isService":false},{"code":"DS-PDP15P-EG2-WB","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Detector movimiento inalámbrico Hikvision 2ª gen","cost":21.96,"pvp35":29.65,"pvp15":25.25,"lastUpdate":"2025-05-21","daysOld":364,"supplier":"","isService":false},{"code":"DS-PDMCS-EG2-WB","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Contacto magnético inalámbrico Hikvision 2ª gen","cost":12.59,"pvp35":17.0,"pvp15":14.48,"lastUpdate":"2025-05-22","daysOld":363,"supplier":"","isService":false},{"code":"DS-PS1-E-WB/RED","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Sirena inalámbrica exterior con luz roja Hikvision","cost":57.8,"pvp35":78.03,"pvp15":66.47,"lastUpdate":"2025-05-23","daysOld":362,"supplier":"","isService":false},{"code":"DS-PK1-E-WB","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Teclado LED para alarma inalámbrico Hikvision","cost":63.25,"pvp35":85.39,"pvp15":72.74,"lastUpdate":"2025-05-24","daysOld":361,"supplier":"","isService":false},{"code":"DS-PR1-WB","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Expansor y repetidor para alarma inalámbrico Hikvision","cost":54.5,"pvp35":73.58,"pvp15":62.67,"lastUpdate":"2025-05-25","daysOld":360,"supplier":"","isService":false},{"code":"DS-PDSMK-S-WB","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Detector de humo inalámbrico Hikvision","cost":36.25,"pvp35":48.94,"pvp15":41.69,"lastUpdate":"2025-05-22","daysOld":363,"supplier":"","isService":false},{"code":"DS-PM1-O1L-WB","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Módulo de relay inalámbrico Hikvision","cost":20.94,"pvp35":28.27,"pvp15":24.08,"lastUpdate":"2025-05-22","daysOld":363,"supplier":"","isService":false},{"code":"DS-PKF1-WB","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Control remoto inalámbrico","cost":16.8,"pvp35":22.68,"pvp15":19.32,"lastUpdate":"2025-05-22","daysOld":363,"supplier":"","isService":false},{"code":"DS-PDPC12PF-EG2WB","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Detector movimiento inalámbrico con cámara Hikvision","cost":85.0,"pvp35":114.75,"pvp15":97.75,"lastUpdate":"2025-05-22","daysOld":363,"supplier":"","isService":false},{"code":"DS-PDEBP1-EG2-WB","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Botón de emergencia inalámbrico Hikvision","cost":13.28,"pvp35":17.93,"pvp15":15.27,"lastUpdate":"2025-05-22","daysOld":363,"supplier":"Sisegusa","isService":false},{"code":"DS-PHA64-KIT-WB","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Kit AX PRO híbrido (sirena + batería 7Ah)","cost":146.25,"pvp35":197.44,"pvp15":168.19,"lastUpdate":"2025-05-22","daysOld":363,"supplier":"","isService":false},{"code":"DS-PHA64-LP","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Panel de alarma 8 zonas expansible a 64 híbrida","cost":95.06,"pvp35":128.33,"pvp15":109.32,"lastUpdate":"2025-05-22","daysOld":363,"supplier":"","isService":false},{"code":"DS-PK1-LRT-HWB","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Teclado LCD para alarma Hikvision","cost":43.01,"pvp35":58.06,"pvp15":49.46,"lastUpdate":"2025-05-22","daysOld":363,"supplier":"","isService":false},{"code":"DS-PDP18-EG2","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Detector movimiento cableado 10m","cost":10.58,"pvp35":14.28,"pvp15":12.17,"lastUpdate":"2025-05-22","daysOld":363,"supplier":"","isService":false},{"code":"DS-PDBG8-EG2-WB","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Detector rotura de cristales inalámbrico","cost":10.75,"pvp35":14.51,"pvp15":12.36,"lastUpdate":"2023-04-21","daysOld":1125,"supplier":"","isService":false},{"code":"DS-PM1-RTHWB","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Receptor inalámbrico 433MHz para alarma híbrida","cost":40.16,"pvp35":54.22,"pvp15":46.18,"lastUpdate":"2023-03-29","daysOld":1148,"supplier":"","isService":false},{"code":"DS-PM1-I802-H","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Expansor y repetidor de 8 zonas inalámbrico Hikvision","cost":36.25,"pvp35":48.94,"pvp15":41.69,"lastUpdate":"2023-04-21","daysOld":1125,"supplier":"","isService":false},{"code":"DS-PA201P-KIT-16WB","category":"Alarmas Hikvision AX PRO / AX HOME","description":"Kit central alarma inalámbrica 16 zonas WiFi línea AX HOME","cost":66.27,"pvp35":89.46,"pvp15":76.21,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"KIT-DSC-PC1616","category":"Alarmas DSC","description":"Kit DSC PC1616 (batería 4Ah + gabinete + teclado LCD + transformador 16VAC + sirena 30W + sensor movimiento + contacto magnético)","cost":112.99,"pvp35":152.54,"pvp15":129.94,"lastUpdate":"2023-12-06","daysOld":896,"supplier":"","isService":false},{"code":"","category":"Alarmas DSC","description":"Sirena cableada 20W","cost":8.44,"pvp35":11.39,"pvp15":9.71,"lastUpdate":"2022-12-06","daysOld":1261,"supplier":"","isService":false},{"code":"","category":"Alarmas DSC","description":"Sirena cableada 30W","cost":15.96,"pvp35":21.55,"pvp15":18.35,"lastUpdate":"2022-12-06","daysOld":1261,"supplier":"","isService":false},{"code":"DI-LIN2","category":"Alarmas DSC","description":"Fotocélula NO/NC 30m 24V","cost":43.88,"pvp35":59.24,"pvp15":50.46,"lastUpdate":"2022-12-19","daysOld":1248,"supplier":"","isService":false},{"code":"OSI-R-SS","category":"Alarmas DSC","description":"System Sensor detector de humo por haz 100m","cost":797.59,"pvp35":1076.75,"pvp15":917.23,"lastUpdate":"2023-03-20","daysOld":1157,"supplier":"","isService":false},{"code":"ROK-Kit-LightsysPlus","category":"Alarmas Rokonet / Risco","description":"Kit Rokonet Lightsys Plus","cost":204.43,"pvp35":275.98,"pvp15":235.09,"lastUpdate":"2023-03-20","daysOld":1157,"supplier":"","isService":false},{"code":"VIP-MC-MT40","category":"Alarmas Rokonet / Risco","description":"Contacto magnético puerta de metal N.C.","cost":4.41,"pvp35":5.95,"pvp15":5.07,"lastUpdate":"2023-03-20","daysOld":1157,"supplier":"","isService":false},{"code":"VIP-MC-MT20","category":"Alarmas Rokonet / Risco","description":"Contacto Lanford N.C. (con instalación)","cost":15.45,"pvp35":20.86,"pvp15":17.77,"lastUpdate":"2023-03-20","daysOld":1157,"supplier":"","isService":false},{"code":"VIP-S30","category":"Alarmas Rokonet / Risco","description":"Sirena 30W 2 tonos VIPERTEK","cost":11.88,"pvp35":16.04,"pvp15":13.66,"lastUpdate":"2023-03-20","daysOld":1157,"supplier":"","isService":false},{"code":"MQ-CAJA-SIRENA","category":"Alarmas Rokonet / Risco","description":"Caja para sirena 21×26×14.5","cost":10.22,"pvp35":13.8,"pvp15":11.75,"lastUpdate":"2023-03-20","daysOld":1157,"supplier":"","isService":false},{"code":"IN-IVP-3000MWEX","category":"Alarmas Rokonet / Risco","description":"Detector infrarrojo pet exterior triple tecnología 35kg","cost":75.86,"pvp35":102.41,"pvp15":87.24,"lastUpdate":"2023-03-20","daysOld":1157,"supplier":"","isService":false},{"code":"ROK-RK315DT","category":"Alarmas Rokonet / Risco","description":"Detector movimiento exterior Risco Watchout doble tecnología 23m","cost":165.38,"pvp35":223.26,"pvp15":190.19,"lastUpdate":"2023-03-20","daysOld":1157,"supplier":"","isService":false},{"code":"ADE-4219","category":"Alarmas Rokonet / Risco","description":"Expansor 8 zonas para paneles Vista","cost":61.79,"pvp35":83.42,"pvp15":71.06,"lastUpdate":"2023-03-20","daysOld":1157,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Alarma Hikvision (módulo cerco)","cost":86.52,"pvp35":116.8,"pvp15":99.5,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Contacto magnético (para cerco)","cost":12.59,"pvp35":17.0,"pvp15":14.48,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Sensor de vibración","cost":4.0,"pvp35":5.4,"pvp15":4.6,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Detector de humo","cost":10.4,"pvp35":14.04,"pvp15":11.96,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Teclado para panel","cost":40.63,"pvp35":54.85,"pvp15":46.72,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Expansor de zonas","cost":37.5,"pvp35":50.63,"pvp15":43.12,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Lámparas de emergencia","cost":18.9,"pvp35":25.52,"pvp15":21.73,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Sirena con luz estroboscópica","cost":3.69,"pvp35":4.98,"pvp15":4.24,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Batería (accesorio cerco)","cost":9.59,"pvp35":12.95,"pvp15":11.03,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Letreros de precaución","cost":1.4,"pvp35":1.89,"pvp15":1.61,"lastUpdate":"2022-12-06","daysOld":1261,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Aisladores","cost":0.25,"pvp35":0.34,"pvp15":0.29,"lastUpdate":"2022-12-06","daysOld":1261,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Templadores","cost":0.25,"pvp35":0.34,"pvp15":0.29,"lastUpdate":"2022-12-06","daysOld":1261,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Rollo alambre galvanizado para cerco 700m calibre 13 / 2.41mm (resiste 55kg)","cost":88.0,"pvp35":118.8,"pvp15":101.2,"lastUpdate":"2023-12-06","daysOld":896,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Electrificador Hagroy Yanex WiFi + batería + sirena","cost":111.61,"pvp35":150.67,"pvp15":128.35,"lastUpdate":"2023-01-17","daysOld":1219,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Energizador Hagroy i12, 3000m de alcance","cost":119.0,"pvp35":160.65,"pvp15":136.85,"lastUpdate":"2023-03-09","daysOld":1168,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Energizador HR15000, 6000m de alcance","cost":200.0,"pvp35":270.0,"pvp15":230.0,"lastUpdate":"2023-03-23","daysOld":1154,"supplier":"","isService":false},{"code":"","category":"Cercas eléctricas y accesorios","description":"Consertiva espiral","cost":12.0,"pvp35":16.2,"pvp15":13.8,"lastUpdate":"2023-02-17","daysOld":1188,"supplier":"","isService":false},{"code":"HG-ALCMXII-3G110","category":"Alarmas comunitarias","description":"Alarma comunitaria Al Com Max II 3G c/audio SMD/TH 110V + sirena + batería","cost":350.0,"pvp35":472.5,"pvp15":402.5,"lastUpdate":"2023-01-20","daysOld":1216,"supplier":"","isService":false},{"code":"","category":"Alarmas comunitarias","description":"Kit alarma comunitaria Hagroy MPR2 inc. batería y sirena","cost":66.07,"pvp35":89.2,"pvp15":75.98,"lastUpdate":"2023-01-26","daysOld":1210,"supplier":"","isService":false},{"code":"PS7-12","category":"Alarmas comunitarias","description":"Batería 7Ah 12V mod PS7-12","cost":13.3,"pvp35":17.96,"pvp15":15.29,"lastUpdate":"2022-12-13","daysOld":1254,"supplier":"","isService":false},{"code":"ES200R-EC","category":"Alarmas comunitarias","description":"Sirena doble tono 30W ES200R-EC","cost":13.4,"pvp35":18.09,"pvp15":15.41,"lastUpdate":"2022-12-13","daysOld":1254,"supplier":"","isService":false},{"code":"HS80","category":"Alarmas comunitarias","description":"Alarm speaker 100W HS80","cost":40.0,"pvp35":54.0,"pvp15":46.0,"lastUpdate":"2022-12-13","daysOld":1254,"supplier":"","isService":false},{"code":"HG-H5KB500","category":"Alarmas comunitarias","description":"Pulsador inalámbrico 4 teclas 433MHz H5KB 500m","cost":10.91,"pvp35":14.73,"pvp15":12.55,"lastUpdate":"2023-03-26","daysOld":1151,"supplier":"","isService":false},{"code":"CAJAALARM","category":"Alarmas comunitarias","description":"Caja metálica para alarmas comunitarias","cost":65.0,"pvp35":87.75,"pvp15":74.75,"lastUpdate":"2023-12-13","daysOld":889,"supplier":"","isService":false},{"code":"","category":"Alarmas comunitarias","description":"Repetidora (alcance 100m)","cost":45.0,"pvp35":60.75,"pvp15":51.75,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"CAJASIRE","category":"Alarmas comunitarias","description":"Caja metálica para sirena ESP30","cost":11.0,"pvp35":14.85,"pvp15":12.65,"lastUpdate":"2022-12-13","daysOld":1254,"supplier":"","isService":false},{"code":"PT-COM-AX65L","category":"Alarmas comunitarias","description":"Panel alarma comunitaria Linseg AX 65L","cost":51.85,"pvp35":70.0,"pvp15":59.63,"lastUpdate":"2022-12-15","daysOld":1252,"supplier":"","isService":false},{"code":"PT-COM-VOX500","category":"Alarmas comunitarias","description":"Panel alarma de perifoneo para CCTV Linseg VOX 500","cost":147.54,"pvp35":199.18,"pvp15":169.67,"lastUpdate":"2022-12-15","daysOld":1252,"supplier":"","isService":false},{"code":"ST-12V-7AMP","category":"Alarmas comunitarias","description":"Batería recargable 12VDC 7A","cost":13.3,"pvp35":17.96,"pvp15":15.29,"lastUpdate":"2022-12-15","daysOld":1252,"supplier":"","isService":false},{"code":"PA-SIRENA","category":"Alarmas comunitarias","description":"Sirena 12VDC 30W 2 tonos","cost":9.86,"pvp35":13.31,"pvp15":11.34,"lastUpdate":"2022-12-15","daysOld":1252,"supplier":"","isService":false},{"code":"PA-CAJASIRENABL","category":"Alarmas comunitarias","description":"Caja de sirena metálica marfil","cost":12.76,"pvp35":17.23,"pvp15":14.67,"lastUpdate":"2022-12-15","daysOld":1252,"supplier":"","isService":false},{"code":"PT-RF5","category":"Alarmas comunitarias","description":"Control remoto alcance hasta 500m","cost":9.95,"pvp35":13.43,"pvp15":11.44,"lastUpdate":"2022-12-15","daysOld":1252,"supplier":"","isService":false},{"code":"","category":"Alarmas comunitarias","description":"Controles adicionales remoto RF5","cost":9.86,"pvp35":13.31,"pvp15":11.34,"lastUpdate":"2023-03-06","daysOld":1171,"supplier":"","isService":false},{"code":"ZK-MA300/ID","category":"Control de acceso","description":"ZKTeco control de acceso huella y proximidad (lector)","cost":102.0,"pvp35":137.7,"pvp15":117.3,"lastUpdate":"2022-12-19","daysOld":1248,"supplier":"","isService":false},{"code":"ZK-LM-2802","category":"Control de acceso","description":"ZKTeco cerradura electromagnética 600 lbs","cost":18.69,"pvp35":25.23,"pvp15":21.49,"lastUpdate":"2022-12-19","daysOld":1248,"supplier":"","isService":false},{"code":"ZK-TLEB102-R","category":"Control de acceso","description":"ZKTeco botón de salida \"Don't Touch\"","cost":20.31,"pvp35":27.42,"pvp15":23.36,"lastUpdate":"2022-12-19","daysOld":1248,"supplier":"","isService":false},{"code":"ZK-TPM005B","category":"Control de acceso","description":"ZKTeco fuente para control de acceso 5A+1A continuos","cost":27.63,"pvp35":37.3,"pvp15":31.77,"lastUpdate":"2022-12-19","daysOld":1248,"supplier":"","isService":false},{"code":"ST-12V-4AMP","category":"Control de acceso","description":"Batería recargable 12VDC 4A","cost":8.8,"pvp35":11.88,"pvp15":10.12,"lastUpdate":"2022-12-19","daysOld":1248,"supplier":"","isService":false},{"code":"PA-CAJAALARMABL","category":"Control de acceso","description":"Caja de alarma metálica blanca","cost":12.47,"pvp35":16.83,"pvp15":14.34,"lastUpdate":"2022-12-19","daysOld":1248,"supplier":"","isService":false},{"code":"ZK-IDLONG","category":"Control de acceso","description":"ZKTeco tarjeta de proximidad largo alcance","cost":1.0,"pvp35":1.35,"pvp15":1.15,"lastUpdate":"2022-12-19","daysOld":1248,"supplier":"","isService":false},{"code":"ZK-PS902B","category":"Control de acceso","description":"Fuente para control de acceso 12VDC 2A","cost":20.98,"pvp35":28.32,"pvp15":24.13,"lastUpdate":"2023-02-27","daysOld":1178,"supplier":"","isService":false},{"code":"DS-K1T342MFX","category":"Control de acceso","description":"Lector biométrico facial huella","cost":122.07,"pvp35":164.79,"pvp15":140.38,"lastUpdate":"2023-11-27","daysOld":905,"supplier":"","isService":false},{"code":"DS-K1T341CMF","category":"Control de acceso","description":"Lector biométrico facial huella (IP65) Hikvision","cost":146.22,"pvp35":197.4,"pvp15":168.15,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-K1T342MFWX-E1","category":"Control de acceso","description":"Lector biométrico facial huella exterior POE y WiFi (genera QR, sirve como portero)","cost":123.41,"pvp35":166.6,"pvp15":141.92,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-K1T344MBFWX-E1","category":"Control de acceso","description":"Lector biométrico facial huella y proximidad (genera QR)","cost":147.56,"pvp35":199.21,"pvp15":169.69,"lastUpdate":"2025-01-10","daysOld":495,"supplier":"Sisegusa","isService":false},{"code":"DS-K1T343MX","category":"Control de acceso","description":"Lector biométrico facial y huella","cost":92.38,"pvp35":124.71,"pvp15":106.24,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-KIS602","category":"Video porteros","description":"Kit videoportero IP DS-KD8003-IME1 + DS-KH6320-WET1 + switch (modular)","cost":184.8,"pvp35":249.48,"pvp15":212.52,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-KH6320-WTE1","category":"Video porteros","description":"Pantalla touch para videoportero edificios TCP/IP 2CH alarma","cost":85.03,"pvp35":114.79,"pvp15":97.78,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-KD-KP","category":"Video porteros","description":"Videoportero modular botonera numérica","cost":56.06,"pvp35":75.68,"pvp15":64.47,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-KD-ACF3","category":"Video porteros","description":"Marco videoportero modular 3 espacios","cost":27.31,"pvp35":36.87,"pvp15":31.41,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-KD-DIS","category":"Video porteros","description":"Módulo display búsqueda contactos","cost":50.31,"pvp35":67.92,"pvp15":57.86,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-KD-ACF2","category":"Video porteros","description":"Marco videoportero modular 2 espacios","cost":24.27,"pvp35":32.76,"pvp15":27.91,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-KH6350-WTE1","category":"Video porteros","description":"Pantalla touch para DS-K1T342MFWX-E1","cost":82.05,"pvp35":110.77,"pvp15":94.36,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-KIS302-P","category":"Video porteros","description":"Kit videoportero Hikvision híbrido","cost":110.45,"pvp35":149.11,"pvp15":127.02,"lastUpdate":"2024-08-20","daysOld":638,"supplier":"Tech","isService":false},{"code":"","category":"Video porteros","description":"Kit Hikvision videoportero análogo HD","cost":66.05,"pvp35":89.17,"pvp15":75.96,"lastUpdate":"2024-08-20","daysOld":638,"supplier":"Tech","isService":false},{"code":"","category":"Video porteros","description":"Pantalla Hikvision para portero análogo","cost":43.52,"pvp35":58.75,"pvp15":50.05,"lastUpdate":"2024-08-20","daysOld":638,"supplier":"Tech","isService":false},{"code":"BE-06-I1070","category":"Gabinetes, racks y accesorios","description":"Gabinete 6UR de pared puerta de vidrio","cost":108.9,"pvp35":147.02,"pvp15":125.23,"lastUpdate":"2024-09-16","daysOld":611,"supplier":"","isService":false},{"code":"BE-09-I1071","category":"Gabinetes, racks y accesorios","description":"Gabinete 9UR de pared puerta de vidrio","cost":126.75,"pvp35":171.11,"pvp15":145.76,"lastUpdate":"2024-09-16","daysOld":611,"supplier":"","isService":false},{"code":"BE-12-I1072","category":"Gabinetes, racks y accesorios","description":"Gabinete 12UR de pared puerta de vidrio","cost":152.15,"pvp35":205.4,"pvp15":174.97,"lastUpdate":"2024-09-16","daysOld":611,"supplier":"","isService":false},{"code":"BE-I-1144","category":"Gabinetes, racks y accesorios","description":"Organizador con tapa 80×80","cost":18.83,"pvp35":25.42,"pvp15":21.65,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"BE-I-1101","category":"Gabinetes, racks y accesorios","description":"Bandeja estándar 19\" 37cm 2UR","cost":16.09,"pvp35":21.72,"pvp15":18.5,"lastUpdate":"2022-12-02","daysOld":1265,"supplier":"","isService":false},{"code":"","category":"Gabinetes, racks y accesorios","description":"Bandeja 19\" 20cm 1U","cost":11.79,"pvp35":15.92,"pvp15":13.56,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Gabinetes, racks y accesorios","description":"Multitoma 4 tomas dobles","cost":31.72,"pvp35":42.82,"pvp15":36.48,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cableado estructurado","description":"Cable UTP int. Cat 5E ×25m","cost":14.0,"pvp35":18.9,"pvp15":16.1,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cableado estructurado","description":"Bobina cable UTP int. Cat 5E (305m)","cost":94.0,"pvp35":126.9,"pvp15":108.1,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cableado estructurado","description":"Bobina cable UTP ext. Cat 5E (305m)","cost":137.0,"pvp35":184.95,"pvp15":157.55,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cableado estructurado","description":"Cable UTP ext. Cat 5E ×100m","cost":66.0,"pvp35":89.1,"pvp15":75.9,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cableado estructurado","description":"Bobina cable UTP int. Cat 6","cost":222.99,"pvp35":301.04,"pvp15":256.44,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cableado estructurado","description":"Cable UTP int. Cat 6 ×100m","cost":60.0,"pvp35":81.0,"pvp15":69.0,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cableado estructurado","description":"Cable UTP ext. Cat 6 ×metro","cost":0.75,"pvp35":1.01,"pvp15":0.86,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cableado estructurado","description":"Cable UTP ext. Cat 6 305m bobina (Newlink)","cost":164.19,"pvp35":221.66,"pvp15":188.82,"lastUpdate":"2024-09-16","daysOld":611,"supplier":"","isService":false},{"code":"","category":"Cableado estructurado","description":"Cable UTP ext. Cat 6 bobina","cost":216.0,"pvp35":291.6,"pvp15":248.4,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cableado estructurado","description":"Rollo cable UTP Cat 5E 305m ext. Hikvision","cost":89.57,"pvp35":120.92,"pvp15":103.01,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cableado estructurado","description":"Rollo cable UTP Cat 5 100% cobre","cost":14.0,"pvp35":18.9,"pvp15":16.1,"lastUpdate":"2022-12-19","daysOld":1248,"supplier":"","isService":false},{"code":"","category":"Cableado estructurado","description":"Cable UTP Cat 5E ext. ×100m","cost":68.0,"pvp35":91.8,"pvp15":78.2,"lastUpdate":"2023-01-09","daysOld":1227,"supplier":"","isService":false},{"code":"NL-PCCAT63PA","category":"Cableado estructurado","description":"Patch cord Cat 6 3 pies azul Newlink","cost":1.66,"pvp35":2.24,"pvp15":1.91,"lastUpdate":"2024-09-16","daysOld":611,"supplier":"","isService":false},{"code":"NL-PCCAT61PA","category":"Cableado estructurado","description":"Patch cord Cat 6 1 pie azul Newlink","cost":1.12,"pvp35":1.51,"pvp15":1.29,"lastUpdate":"2024-09-16","daysOld":611,"supplier":"","isService":false},{"code":"NL-JACKCAT6A","category":"Cableado estructurado","description":"Keystone jack Cat 6 azul Newlink","cost":1.88,"pvp35":2.54,"pvp15":2.16,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Cableado estructurado","description":"Conectores RJ45 Cat 6 con capucha","cost":0.35,"pvp35":0.47,"pvp15":0.4,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Rollo funda sellada 1/2 ×20m","cost":25.6,"pvp35":34.56,"pvp15":29.44,"lastUpdate":"2022-12-19","daysOld":1248,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Conectores sellado 1/2","cost":0.7,"pvp35":0.95,"pvp15":0.8,"lastUpdate":"2022-12-19","daysOld":1248,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Cajas metálicas con tapa 4×4","cost":1.35,"pvp35":1.82,"pvp15":1.55,"lastUpdate":"2022-12-19","daysOld":1248,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Rollo cable eléctrico 2×16 ×25m","cost":13.75,"pvp35":18.56,"pvp15":15.81,"lastUpdate":"2022-12-19","daysOld":1248,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Grapa EMT 1/2","cost":0.6,"pvp35":0.81,"pvp15":0.69,"lastUpdate":"2022-12-19","daysOld":1248,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Cajas Dexon 10×10","cost":2.3,"pvp35":3.11,"pvp15":2.64,"lastUpdate":"2022-12-19","daysOld":1248,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Cajas Dexon rectangular con tapa","cost":55.0,"pvp35":74.25,"pvp15":63.25,"lastUpdate":"2022-12-20","daysOld":1247,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Tubería 1/2\"","cost":0.9,"pvp35":1.22,"pvp15":1.03,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Codo 1/2\"","cost":0.09,"pvp35":0.12,"pvp15":0.1,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Conector PVC 1/2\"","cost":0.24,"pvp35":0.32,"pvp15":0.28,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Toma sobreponer","cost":2.5,"pvp35":3.38,"pvp15":2.88,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Regleta 6 tomas con conexión a tierra","cost":3.31,"pvp35":4.47,"pvp15":3.81,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Grapas ×100 unidades","cost":4.0,"pvp35":5.4,"pvp15":4.6,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Tubo EMT 1/2","cost":3.9,"pvp35":5.27,"pvp15":4.48,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Taco y tornillo ×doc","cost":1.0,"pvp35":1.35,"pvp15":1.15,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Manguera negra 1/2 100m","cost":22.2,"pvp35":29.97,"pvp15":25.53,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Manguera metálica BX 1/2\" ×10m","cost":17.5,"pvp35":23.63,"pvp15":20.12,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Conector BX 1/2","cost":0.38,"pvp35":0.51,"pvp15":0.44,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Amarras plásticas","cost":6.0,"pvp35":8.1,"pvp15":6.9,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Caja Dexson 40mm blanco (DXN5011S)","cost":1.8,"pvp35":2.43,"pvp15":2.07,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Caja de paso PVC 15×15×7","cost":3.8,"pvp35":5.13,"pvp15":4.37,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Caja de paso PVC 40×35×12","cost":19.5,"pvp35":26.33,"pvp15":22.42,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Caja PVC 30×25","cost":10.5,"pvp35":14.18,"pvp15":12.07,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Materiales eléctricos / instalación","description":"Cajas octagonales metálicas con tapa","cost":0.76,"pvp35":1.03,"pvp15":0.87,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"UPS / Estabilizadores / Respaldo","description":"UPS Forza 1000VA/500W 6 salidas 120V","cost":44.94,"pvp35":60.67,"pvp15":51.68,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"UPS / Estabilizadores / Respaldo","description":"UPS 1KVA Forza","cost":67.5,"pvp35":91.13,"pvp15":77.62,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"UPS / Estabilizadores / Respaldo","description":"UPS 1KVA Xmart XMA5031 + batería 100Ah","cost":499.0,"pvp35":673.65,"pvp15":573.85,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"UPS / Estabilizadores / Respaldo","description":"Regulador voltaje industrial 1.5KVA","cost":230.0,"pvp35":310.5,"pvp15":264.5,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"UPS / Estabilizadores / Respaldo","description":"Regulador voltaje industrial 3KVA","cost":350.0,"pvp35":472.5,"pvp15":402.5,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Estructuras (postes, torres, casetas, pararrayos)","description":"Postes 6m tubo galvanizado ISO II 2\" con placa base 25×25×6mm + bases hormigón","cost":450.0,"pvp35":607.5,"pvp15":517.5,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Estructuras (postes, torres, casetas, pararrayos)","description":"Torre lineal de 30m altura","cost":2220.0,"pvp35":2997.0,"pvp15":2553.0,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Estructuras (postes, torres, casetas, pararrayos)","description":"Bases hormigón armado 3 puntos anclaje 40×40×150cm + centro 60×60×90cm (torre)","cost":320.0,"pvp35":432.0,"pvp15":368.0,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Estructuras (postes, torres, casetas, pararrayos)","description":"Base para PTZ Position montaje en torre","cost":80.0,"pvp35":108.0,"pvp15":92.0,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Estructuras (postes, torres, casetas, pararrayos)","description":"Pararrayos Franklin 5 puntas","cost":1290.0,"pvp35":1741.5,"pvp15":1483.5,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Estructuras (postes, torres, casetas, pararrayos)","description":"Caseta metálica 30×25×20 estructura tubo cuadrado lámina galvanizada 1/25 chapa seguridad","cost":125.0,"pvp35":168.75,"pvp15":143.75,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Estructuras (postes, torres, casetas, pararrayos)","description":"Caseta metálica 40×30×20","cost":160.0,"pvp35":216.0,"pvp15":184.0,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Estructuras (postes, torres, casetas, pararrayos)","description":"Caseta metálica 60×40×60","cost":320.0,"pvp35":432.0,"pvp15":368.0,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Estructuras (postes, torres, casetas, pararrayos)","description":"Mantenimiento torre lineal 30m","cost":600.0,"pvp35":810.0,"pvp15":690.0,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-1602ZJ-POLE","category":"Soportes y accesorios para cámaras","description":"Soporte de poste para PTZ Hikvision","cost":25.67,"pvp35":34.65,"pvp15":29.52,"lastUpdate":"2024-01-19","daysOld":852,"supplier":"Sisegusa","isService":false},{"code":"DS-1602ZJ","category":"Soportes y accesorios para cámaras","description":"Soporte de pared para PTZ Hikvision","cost":13.5,"pvp35":18.23,"pvp15":15.52,"lastUpdate":"2024-01-19","daysOld":852,"supplier":"Sisegusa","isService":false},{"code":"DS-1602ZJ-CORNER","category":"Soportes y accesorios para cámaras","description":"Soporte de esquina para PTZ Hikvision","cost":25.67,"pvp35":34.65,"pvp15":29.52,"lastUpdate":"2024-01-19","daysOld":852,"supplier":"Sisegusa","isService":false},{"code":"DS-1660ZJ","category":"Soportes y accesorios para cámaras","description":"Soporte largo para cámara PTZ","cost":43.45,"pvp35":58.66,"pvp15":49.97,"lastUpdate":"2024-01-19","daysOld":852,"supplier":"Sisegusa","isService":false},{"code":"DS-1602ZJ-Pole","category":"Soportes y accesorios para cámaras","description":"Brazo para PTZ IP","cost":32.0,"pvp35":43.2,"pvp15":36.8,"lastUpdate":"2023-02-10","daysOld":1195,"supplier":"","isService":false},{"code":"ST-DC-SR-1MT-FIJO","category":"Soportes y accesorios para cámaras","description":"Soporte recto reajustable 1m caja fija","cost":16.35,"pvp35":22.07,"pvp15":18.8,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"ST-DC-SR-1MT-MOVIBLE","category":"Soportes y accesorios para cámaras","description":"Soporte recto reajustable 1m caja movible","cost":14.8,"pvp35":19.98,"pvp15":17.02,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"ST-DC-SL-1MT-MOVIBLE","category":"Soportes y accesorios para cámaras","description":"Soporte en L reajustable 1m caja movible","cost":17.51,"pvp35":23.64,"pvp15":20.14,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Soportes y accesorios para cámaras","description":"Brazo extensor para cámara","cost":90.0,"pvp35":121.5,"pvp15":103.5,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Soportes y accesorios para cámaras","description":"Soporte / brazo para cámara PTZ","cost":39.2,"pvp35":52.92,"pvp15":45.08,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"FT-PTZ-CAB","category":"Soportes y accesorios para cámaras","description":"Cable de poder para fuente cámara PTZ 4\"","cost":2.23,"pvp35":3.01,"pvp15":2.56,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"","category":"Soportes y accesorios para cámaras","description":"Fuente para cámara 110VAC/12VDC 1A","cost":2.63,"pvp35":3.55,"pvp15":3.02,"lastUpdate":"2023-03-28","daysOld":1149,"supplier":"","isService":false},{"code":"FT-CAMX18","category":"Soportes y accesorios para cámaras","description":"Fuente centralizada 110/12VCD 10A (para 10 cámaras)","cost":27.0,"pvp35":36.45,"pvp15":31.05,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Soportes y accesorios para cámaras","description":"Fuente para cámara 5A","cost":5.75,"pvp35":7.76,"pvp15":6.61,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Soportes y accesorios para cámaras","description":"Pareja balluns HD-TVI 4K","cost":1.79,"pvp35":2.42,"pvp15":2.06,"lastUpdate":"2023-02-13","daysOld":1192,"supplier":"","isService":false},{"code":"","category":"Soportes y accesorios para cámaras","description":"Fuente adaptador 24V 1Ah","cost":8.0,"pvp35":10.8,"pvp15":9.2,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Soportes y accesorios para cámaras","description":"Conector coaxial","cost":0.5,"pvp35":0.68,"pvp15":0.57,"lastUpdate":"2023-02-14","daysOld":1191,"supplier":"","isService":false},{"code":"","category":"Soportes y accesorios para cámaras","description":"Cable coaxial RG6A ×1m","cost":0.5,"pvp35":0.68,"pvp15":0.57,"lastUpdate":"2023-02-14","daysOld":1191,"supplier":"","isService":false},{"code":"DS-6904UDI","category":"Video Wall / Decoders","description":"Decoder de 4CH HDMI","cost":1035.13,"pvp35":1397.43,"pvp15":1190.4,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-6908UDI","category":"Video Wall / Decoders","description":"Decoder de 8CH HDMI","cost":1322.95,"pvp35":1785.98,"pvp15":1521.39,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-6916UDI","category":"Video Wall / Decoders","description":"Decoder de 16CH HDMI","cost":2258.2,"pvp35":3048.57,"pvp15":2596.93,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"DS-AE-DC2018-K2","category":"Dashcams Hikvision","description":"K2 Dashcam 1080P WiFi Hikvision","cost":35.64,"pvp35":48.11,"pvp15":40.99,"lastUpdate":"2023-05-10","daysOld":1106,"supplier":"Sisegusa","isService":false},{"code":"DS-AE-DC5313-C6","category":"Dashcams Hikvision","description":"C6 Dashcam 1600P WiFi con pantalla Hikvision","cost":94.36,"pvp35":127.39,"pvp15":108.51,"lastUpdate":"2022-12-01","daysOld":1266,"supplier":"","isService":false},{"code":"DS-AE-DC4328-K5","category":"Dashcams Hikvision","description":"K5 Dashcam 1600P doble cámara WiFi con pantalla","cost":95.52,"pvp35":128.95,"pvp15":109.85,"lastUpdate":"2023-05-10","daysOld":1106,"supplier":"Sisegusa","isService":false},{"code":"AE-DI5042-G4","category":"Dashcams Hikvision","description":"5CH dashcam 4G/GPS","cost":268.31,"pvp35":362.22,"pvp15":308.56,"lastUpdate":"2022-12-02","daysOld":1265,"supplier":"","isService":false},{"code":"AE-VC143T-ITS","category":"Dashcams Hikvision","description":"Cámara análoga 720P 1/2.9\" CMOS infrarroja matriz cilíndrica","cost":43.09,"pvp35":58.17,"pvp15":49.55,"lastUpdate":"2022-12-02","daysOld":1265,"supplier":"","isService":false},{"code":"AE-VC154T-IT","category":"Dashcams Hikvision","description":"Cámara DSM matriz infrarroja 720P 1/2.9\" CMOS","cost":54.84,"pvp35":74.03,"pvp15":63.07,"lastUpdate":"2022-12-02","daysOld":1265,"supplier":"","isService":false},{"code":"AE-IFC00","category":"Dashcams Hikvision","description":"Botón de pánico compatible con dashcam AE-DI5042-G4","cost":8.0,"pvp35":10.8,"pvp15":9.2,"lastUpdate":"2022-12-02","daysOld":1265,"supplier":"","isService":false},{"code":"","category":"GPS","description":"GPS Teltonika FMC 130","cost":58.99,"pvp35":79.64,"pvp15":67.84,"lastUpdate":"2023-12-06","daysOld":896,"supplier":"M2M Ecuador","isService":false},{"code":"","category":"GPS","description":"Botón de pánico","cost":2.0,"pvp35":2.7,"pvp15":2.3,"lastUpdate":"2023-03-21","daysOld":1156,"supplier":"","isService":false},{"code":"","category":"GPS","description":"Eye sensor Teltonika (accesorio)","cost":39.0,"pvp35":52.65,"pvp15":44.85,"lastUpdate":"2023-03-21","daysOld":1156,"supplier":"","isService":false},{"code":"","category":"Motores y accesorios para portón","description":"Cremallera galvanizada","cost":15.0,"pvp35":20.25,"pvp15":17.25,"lastUpdate":"2023-01-10","daysOld":1226,"supplier":"","isService":false},{"code":"","category":"Motores y accesorios para portón","description":"Kit motor italiano Roger 600KG puerta garage corrediza","cost":284.25,"pvp35":383.74,"pvp15":326.89,"lastUpdate":"2023-01-10","daysOld":1226,"supplier":"","isService":false},{"code":"","category":"Motores y accesorios para portón","description":"Antena Ditec 433MHz","cost":16.5,"pvp35":22.28,"pvp15":18.97,"lastUpdate":"2023-01-10","daysOld":1226,"supplier":"","isService":false},{"code":"","category":"Memorias y accesorios","description":"Micro SD 32GB para cámara","cost":6.42,"pvp35":8.67,"pvp15":7.38,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Memorias y accesorios","description":"Micro SD 64GB para cámara","cost":6.96,"pvp35":9.4,"pvp15":8.0,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Memorias y accesorios","description":"Micro SD 128GB para cámara","cost":16.22,"pvp35":21.9,"pvp15":18.65,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"","category":"Memorias y accesorios","description":"Micro SD 256GB para cámara","cost":36.0,"pvp35":48.6,"pvp15":41.4,"lastUpdate":null,"daysOld":null,"supplier":"","isService":false},{"code":"INS-CAM","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Instalación de cámara (por cámara)","cost":25.0,"pvp35":33.75,"pvp15":28.75,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"INS-PUNTO","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Punto de red certificado","cost":10.0,"pvp35":13.5,"pvp15":11.5,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"INS-CFG","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Configuración (por equipo)","cost":10.0,"pvp35":13.5,"pvp15":11.5,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"INS-DVR","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Instalación y configuración de DVR con disco duro","cost":30.0,"pvp35":40.5,"pvp15":34.5,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"INS-KIT-CE","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Instalación kit cerca eléctrica","cost":20.0,"pvp35":27.0,"pvp15":23.0,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"INS-ALAM-CE","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Instalación alambrado (cerco) — por metro","cost":3.0,"pvp35":4.05,"pvp15":3.45,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"INS-BUJ-CE","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Instalación cable de bujía (cerco)","cost":1.0,"pvp35":1.35,"pvp15":1.15,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"INS-FOTOBEAM","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Instalación y configuración de sensor Fotobeam","cost":30.0,"pvp35":40.5,"pvp15":34.5,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"INS-KIT-AXPRO","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Instalación y configuración de kit Hikvision AX PRO","cost":50.0,"pvp35":67.5,"pvp15":57.5,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"INS-VIDEOP","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Instalación de video portero","cost":60.0,"pvp35":81.0,"pvp15":69.0,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"INS-CFG-5CAM","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Instalación y configuración +5 cámaras (paquete)","cost":200.0,"pvp35":270.0,"pvp15":230.0,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"INS-ALARMA-H","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Configuración de alarma híbrida","cost":35.0,"pvp35":47.25,"pvp15":40.25,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"INS-PUNTO-AD","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Puntos adicionales","cost":10.0,"pvp35":13.5,"pvp15":11.5,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"INS-PANICO","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Instalación de botón de pánico","cost":5.0,"pvp35":6.75,"pvp15":5.75,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"INS-VIATICO-SE","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Viáticos 2 días a Santa Elena (referencial)","cost":70.0,"pvp35":94.5,"pvp15":80.5,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"día"},{"code":"MANT-ALAR","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Mantenimiento alarmas (sensores/botones/contactos, por unidad)","cost":7.0,"pvp35":9.45,"pvp15":8.05,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"INS-MANO-LIDER","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Instalación / mano de obra líder + 15 extra","cost":215.0,"pvp35":290.25,"pvp15":247.25,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"INS-VIATICO-MACH","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Viáticos a Machala / Huaquillas","cost":40.0,"pvp35":54.0,"pvp15":46.0,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"},{"code":"","category":"SERVICIOS DE INSTALACIÓN Y MANO DE OBRA","description":"Brazos metálicos para sensor","cost":15.0,"pvp35":20.25,"pvp15":17.25,"lastUpdate":null,"daysOld":null,"supplier":"","isService":true,"unit":"u"}];

// === ESTADO ===
let currentMargin = 35;
let cart = [];
let currentSession = null;

// ====== CONFIGURACIÓN GEMESEG ======
// Autenticación manejada por Supabase (ver src/modules/auth.js)

// === UTILIDADES ===
const $ = id => document.getElementById(id);
const fmt = n => '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function freshness(daysOld) {
  if (daysOld === null || daysOld === undefined) return 'stale';
  if (daysOld <= 30) return 'fresh';
  if (daysOld <= 180) return 'aging';
  return 'stale';
}

function toast(msg, type = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 2400);
}

function generateCotNumber() {
  const d = new Date();
  const ymd = d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  const key = 'cot_seq_' + ymd;
  let seq = parseInt(localStorage.getItem(key) || '0') + 1;
  localStorage.setItem(key, String(seq));
  return 'COT-' + ymd + '-' + String(seq).padStart(3,'0');
}

function getPrice(item) {
  return currentMargin === 35 ? item.pvp35 : item.pvp15;
}

// === RENDER CATÁLOGO ===
function renderCatalog() {
  const q = $('search').value.toLowerCase().trim();
  const cat = $('categoryFilter').value;
  const list = $('catalogList');
  const filtered = CATALOG.filter(item => {
    if (cat && item.category !== cat) return false;
    if (!q) return true;
    return (item.code || '').toLowerCase().includes(q) ||
           item.description.toLowerCase().includes(q);
  });
  $('catalogCount').textContent = filtered.length + ' ítems' + (filtered.length !== CATALOG.length ? ' (de ' + CATALOG.length + ')' : '');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="icon">🔍</div>No se encontraron productos</div>';
    return;
  }
  list.innerHTML = filtered.slice(0, 200).map((item, idx) => {
    const realIdx = CATALOG.indexOf(item);
    const fr = freshness(item.daysOld);
    const dateLabel = item.lastUpdate || 's/f';
    const supplier = item.supplier ? '· ' + item.supplier : '';
    const code = item.code || '(sin código)';
    return `
      <div class="cat-item">
        <div class="cat-item-info">
          <div class="cat-item-code">${code}</div>
          <div class="cat-item-desc">${item.description}</div>
          <div class="cat-item-meta"><span><span class="freshness ${fr}"></span>${dateLabel}</span><span>${supplier}</span><span style="opacity:0.6">${item.category.split('(')[0].trim()}</span></div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <div class="cat-item-price">
            <div class="pvp">${fmt(getPrice(item))}</div>
            <div class="cost">costo ${fmt(item.cost)}</div>
          </div>
          <button class="add-btn" onclick="addToCart(${realIdx})">+ Agregar</button>
        </div>
      </div>
    `;
  }).join('');
  if (filtered.length > 200) {
    list.innerHTML += '<div class="empty-state" style="padding:14px;font-size:11px;">Mostrando 200 de ' + filtered.length + ' resultados. Refina la búsqueda.</div>';
  }
}

function renderCategories() {
  const cats = [...new Set(CATALOG.map(i => i.category))].sort();
  const sel = $('categoryFilter');
  cats.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c.length > 60 ? c.slice(0, 60) + '…' : c;
    sel.appendChild(opt);
  });
}

// === CART ===
function addToCart(idx) {
  const item = CATALOG[idx];
  const existing = cart.find(c => c.catalogIdx === idx);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ catalogIdx: idx, qty: 1, unit: item.unit || 'u' });
  }
  renderCart();
  saveDraft();
  toast('✓ ' + item.description.slice(0,40) + (item.description.length > 40 ? '…' : '') + ' agregado', 'success');
}

function updateQty(idx, qty) {
  const q = parseFloat(qty) || 0;
  if (q <= 0) { removeItem(idx); return; }
  cart[idx].qty = q;
  renderCart();
  saveDraft();
}

function removeItem(idx) {
  cart.splice(idx, 1);
  renderCart();
  saveDraft();
}

function renderCart() {
  const c = $('itemsContainer');
  $('itemsCount').textContent = cart.length + ' ítem' + (cart.length === 1 ? '' : 's');
  if (cart.length === 0) {
    c.innerHTML = '<div class="empty-state"><div class="icon">🛒</div><div>Aún no hay productos en la cotización.</div><div style="margin-top:4px;font-size:11px;">Busca y agrega productos del catálogo (panel izquierdo)</div></div>';
    renderTotals();
    return;
  }
  c.innerHTML = `
    <table class="items-table">
      <thead>
        <tr>
          <th class="item-num">#</th>
          <th>Descripción</th>
          <th class="center" style="width:60px;">Unidad</th>
          <th class="center" style="width:70px;">Cant</th>
          <th class="right" style="width:90px;">Valor unit.</th>
          <th class="right" style="width:100px;">Total</th>
          <th style="width:40px;"></th>
        </tr>
      </thead>
      <tbody>
        ${cart.map((c, idx) => {
          const item = CATALOG[c.catalogIdx];
          const price = getPrice(item);
          const total = price * c.qty;
          return `
            <tr>
              <td class="item-num">${idx+1}</td>
              <td class="item-desc">
                ${item.description}
                ${item.code ? '<small>' + item.code + (item.supplier ? ' · ' + item.supplier : '') + '</small>' : ''}
              </td>
              <td class="center">${c.unit || 'u'}</td>
              <td class="center"><input type="number" min="0" step="any" value="${c.qty}" class="qty-input" onchange="updateQty(${idx}, this.value)"></td>
              <td class="right">${fmt(price)}</td>
              <td class="right"><strong>${fmt(total)}</strong></td>
              <td><button class="remove-btn" onclick="removeItem(${idx})" title="Eliminar">✕</button></td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
  renderTotals();
}

function renderTotals() {
  const subtotal = cart.reduce((s, c) => {
    const item = CATALOG[c.catalogIdx];
    return s + getPrice(item) * c.qty;
  }, 0);
  const iva = subtotal * 0.15;
  const total = subtotal + iva;
  $('subtotalView').textContent = fmt(subtotal);
  $('ivaView').textContent = fmt(iva);
  $('totalView').textContent = fmt(total);
}

function setModality(m) {
  currentMargin = m;
  renderCatalog();
  renderCart();
  saveDraft();
}

// === IMPRIMIR: actualizar print-only ===
function syncPrintView() {
  $('printCotNum').textContent = $('cotNum').value || '—';
  $('printCotDate').textContent = $('cotDate').value || '—';
  $('printClientName').textContent = $('clientName').value || '—';
  $('printClientRuc').textContent = $('clientRuc').value || '—';
  $('printClientAddress').textContent = $('clientAddress').value || '—';
  $('printClientContact').textContent = $('clientContact').value || '—';
  $('printClientPhone').textContent = $('clientPhone').value || '—';
  $('printClientEmail').textContent = $('clientEmail').value || '—';
}
window.addEventListener('beforeprint', syncPrintView);

// === GUARDAR / CARGAR ===
function buildQuoteData() {
  return {
    cotNum: $('cotNum').value,
    cotDate: $('cotDate').value,
    client: {
      name: $('clientName').value,
      ruc: $('clientRuc').value,
      address: $('clientAddress').value,
      contact: $('clientContact').value,
      phone: $('clientPhone').value,
      email: $('clientEmail').value,
    },
    margin: currentMargin,
    items: cart,
    savedAt: new Date().toISOString(),
  };
}

function loadQuoteData(q) {
  $('cotNum').value = q.cotNum || '';
  $('cotDate').value = q.cotDate || '';
  $('clientName').value = q.client.name || '';
  $('clientRuc').value = q.client.ruc || '';
  $('clientAddress').value = q.client.address || '';
  $('clientContact').value = q.client.contact || '';
  $('clientPhone').value = q.client.phone || '';
  $('clientEmail').value = q.client.email || '';
  currentMargin = q.margin || 35;
  document.querySelector('input[name="modality"][value="' + currentMargin + '"]').checked = true;
  cart = q.items || [];
  renderCatalog();
  renderCart();
}

function saveDraft() {
  localStorage.setItem('quote_draft', JSON.stringify(buildQuoteData()));
}

function loadDraft() {
  const raw = localStorage.getItem('quote_draft');
  if (!raw) { toast('No hay borrador guardado', 'danger'); return; }
  try { loadQuoteData(JSON.parse(raw)); toast('Borrador cargado'); }
  catch(e) { toast('Error al cargar borrador', 'danger'); }
}

function saveQuote() {
  const data = buildQuoteData();
  if (!data.client.name || cart.length === 0) {
    toast('Llena el cliente y agrega al menos un ítem', 'danger');
    return;
  }
  if (!data.cotNum) {
    data.cotNum = generateCotNumber();
    $('cotNum').value = data.cotNum;
  }
  const saved = JSON.parse(localStorage.getItem('saved_quotes') || '[]');
  saved.unshift(data);
  localStorage.setItem('saved_quotes', JSON.stringify(saved.slice(0, 100)));
  toast('✓ Cotización guardada: ' + data.cotNum, 'success');
}

function openSavedModal() {
  const saved = JSON.parse(localStorage.getItem('saved_quotes') || '[]');
  const body = $('savedModalBody');
  if (saved.length === 0) {
    body.innerHTML = '<div class="empty-state"><div class="icon">📂</div>No hay cotizaciones guardadas todavía.</div>';
  } else {
    body.innerHTML = '<ul class="saved-list">' + saved.map((q, idx) => {
      const subtotal = q.items.reduce((s, c) => {
        const item = CATALOG[c.catalogIdx];
        if (!item) return s;
        return s + (q.margin === 35 ? item.pvp35 : item.pvp15) * c.qty;
      }, 0);
      const total = subtotal * 1.15;
      const d = new Date(q.savedAt);
      return `
        <li class="saved-item">
          <div class="saved-item-info">
            <div class="saved-cliente">${q.client.name || '(sin nombre)'}</div>
            <div class="saved-meta">${q.cotNum || '(sin número)'} · ${q.items.length} ítems · ${fmt(total)} · ${d.toLocaleDateString('es-EC')} ${d.toLocaleTimeString('es-EC', {hour:'2-digit',minute:'2-digit'})}</div>
          </div>
          <div class="saved-item-actions">
            <button class="btn btn-ghost" onclick="loadSaved(${idx})">Cargar</button>
            <button class="btn btn-danger" onclick="deleteSaved(${idx})">Eliminar</button>
          </div>
        </li>
      `;
    }).join('') + '</ul>';
  }
  $('savedModal').classList.add('open');
}

function closeSavedModal() {
  $('savedModal').classList.remove('open');
}

function loadSaved(idx) {
  const saved = JSON.parse(localStorage.getItem('saved_quotes') || '[]');
  loadQuoteData(saved[idx]);
  closeSavedModal();
  toast('✓ Cotización cargada');
}

function deleteSaved(idx) {
  if (!confirm('¿Eliminar esta cotización guardada?')) return;
  const saved = JSON.parse(localStorage.getItem('saved_quotes') || '[]');
  saved.splice(idx, 1);
  localStorage.setItem('saved_quotes', JSON.stringify(saved));
  openSavedModal();
  toast('Cotización eliminada');
}

function newQuote() {
  if (cart.length > 0 && !confirm('¿Limpiar todo y empezar nueva cotización? El borrador actual se perderá.')) return;
  cart = [];
  ['cotNum','cotDate','clientName','clientRuc','clientAddress','clientContact','clientPhone','clientEmail'].forEach(id => $(id).value = '');
  $('cotNum').value = generateCotNumber();
  $('cotDate').value = new Date().toISOString().split('T')[0];
  currentMargin = 35;
  document.querySelector('input[name="modality"][value="35"]').checked = true;
  renderCatalog();
  renderCart();
  saveDraft();
}

function exportJSON() {
  const data = buildQuoteData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (data.cotNum || 'cotizacion') + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

// === CONFIG ===
const CONFIG_KEY = 'drive_config';
function getConfig() {
  try { return JSON.parse(localStorage.getItem(CONFIG_KEY) || '{}'); }
  catch(e) { return {}; }
}
function setConfig(c) { localStorage.setItem(CONFIG_KEY, JSON.stringify(c)); }

// === DRIVE MODAL ===
function openDriveModal() {
  const c = getConfig();
  $('driveUrlInput').value = c.driveUrl || '';
  $('driveResult').innerHTML = '';
  $('driveModal').classList.add('open');
}
function closeDriveModal() { $('driveModal').classList.remove('open'); }

async function testAndSaveUrl() {
  const url = $('driveUrlInput').value.trim();
  if (!url) { $('driveResult').innerHTML = errBox('Pega una URL antes de probar'); return; }
  if (!url.includes('docs.google.com')) { $('driveResult').innerHTML = errBox('La URL debe ser de Google Sheets (docs.google.com)'); return; }

  $('driveResult').innerHTML = '<div style="padding:12px;background:#f3f4f6;border-radius:6px;font-size:13px;">⏳ Probando conexión y procesando archivo…</div>';

  try {
    const text = await fetchCsv(url);
    const items = parseCatalogFromCSV(text);
    if (items.length === 0) throw new Error('No se detectaron productos válidos. Verifica que la hoja publicada tenga el formato esperado (Modelo, Producto/Servicio, Costo Unitario, Precio/Und).');
    // Guardar URL para sync automática futura
    const cfg = getConfig();
    cfg.driveUrl = url;
    setConfig(cfg);
    applyNewCatalog(items, 'Google Drive');
  } catch(e) {
    $('driveResult').innerHTML = errBox(e.message + '<br><br>Si dice "Failed to fetch", probablemente abriste el cotizador como archivo local. La sincronización automática requiere hospedar la app online (ver instrucciones arriba). Mientras tanto, usa la pestaña "Cargar archivo".');
  }
}

function errBox(msg) {
  return `<div style="padding:12px;background:#fee2e2;border:1px solid #fca5a5;border-radius:6px;font-size:13px;color:#991b1b;"><strong>Error:</strong> ${msg}</div>`;
}

// === TABS DE SINCRONIZACIÓN ===
function switchSyncTab(tab) {
  $('driveResult').innerHTML = '';
  if (tab === 'manual') {
    $('tabManual').classList.add('active');
    $('tabAuto').classList.remove('active');
    $('syncManual').style.display = 'block';
    $('syncAuto').style.display = 'none';
  } else {
    $('tabAuto').classList.add('active');
    $('tabManual').classList.remove('active');
    $('syncAuto').style.display = 'block';
    $('syncManual').style.display = 'none';
  }
}

// === CARGA MANUAL DE CSV (funciona desde archivo local) ===
function importLocalCsv() {
  const f = $('csvFileInput').files[0];
  if (!f) { $('driveResult').innerHTML = errBox('Selecciona un archivo CSV primero'); return; }
  $('driveResult').innerHTML = '<div style="padding:12px;background:#f3f4f6;border-radius:6px;font-size:13px;">⏳ Procesando archivo…</div>';
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const items = parseCatalogFromCSV(e.target.result);
      if (items.length === 0) throw new Error('No se detectaron productos válidos. Verifica que el CSV sea de la hoja de precios (con columnas Modelo, Producto/Servicio, Costo Unitario, Precio/Und).');
      applyNewCatalog(items, 'archivo cargado');
    } catch(err) {
      $('driveResult').innerHTML = errBox(err.message);
    }
  };
  reader.onerror = () => { $('driveResult').innerHTML = errBox('No se pudo leer el archivo'); };
  reader.readAsText(f, 'utf-8');
}

// === APLICAR NUEVO CATÁLOGO (común para manual y automático) ===
function applyNewCatalog(items, fuente) {
  const cats = [...new Set(items.map(i => i.category))];
  const services = items.filter(i => i.isService).length;
  CATALOG.length = 0;
  items.forEach(i => CATALOG.push(i));
  localStorage.setItem('custom_catalog', JSON.stringify(items));
  const cfg = getConfig();
  cfg.lastSync = new Date().toISOString();
  setConfig(cfg);
  $('categoryFilter').innerHTML = '<option value="">Todas las categorías</option>';
  renderCategories();
  renderCatalog();
  updateSyncStatus();
  $('driveResult').innerHTML = `
    <div style="padding:12px;background:#dcfce7;border:1px solid #86efac;border-radius:6px;font-size:13px;">
      <strong style="color:#166534;">✓ Catálogo actualizado desde ${fuente}</strong><br>
      <div style="margin-top:6px;">Productos: <strong>${items.length - services}</strong> · Servicios: <strong>${services}</strong> · Categorías: <strong>${cats.length}</strong></div>
    </div>`;
  toast('✓ Catálogo actualizado: ' + items.length + ' ítems', 'success');
  setTimeout(() => closeDriveModal(), 2200);
}

// === FETCH CSV (con respaldo automático para Google Sheets) ===
async function fetchCsv(url) {
  const bust = u => u + (u.includes('?') ? '&' : '?') + '_t=' + Date.now();
  try {
    const resp = await fetch(bust(url));
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const text = await resp.text();
    if (!text || text.trim().length < 5) throw new Error('Respuesta vacía');
    return text;
  } catch(e) {
    // Respaldo: si era gviz, intentar el endpoint export
    if (url.includes('/gviz/tq')) {
      const exportUrl = url.replace(/\/gviz\/tq\?tqx=out:csv/, '/export?format=csv');
      const resp2 = await fetch(bust(exportUrl));
      if (!resp2.ok) throw new Error('No se pudo descargar el archivo (HTTP ' + resp2.status + '). Verifica que la hoja esté compartida como "cualquiera con el enlace".');
      return await resp2.text();
    }
    throw e;
  }
}

// === PARSER CSV ===
function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i+1];
    if (inQuotes) {
      if (ch === '"' && next === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { cell += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (ch === '\r') { /* ignore */ }
      else { cell += ch; }
    }
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

// === PARSER INTELIGENTE DEL CATÁLOGO ===
// Maneja el formato real de "COSTOS y PROFORMAS": columna "Modelo" (código),
// "Precio/Und" (PVP sin IVA), múltiples tablas, filas vacías intercaladas, notas.
function parseCatalogFromCSV(text) {
  const rows = parseCSV(text);
  const items = [];
  const today = new Date('2026-05-20');
  let currentCategory = 'Sin categoría';
  let colMap = null;
  const normalize = s => (s || '').toString().trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const COL_NAMES = ['modelo','producto / servicio','producto','servicio','unds','costo unitario','costo','margen ganancia 35%','precio/und','precio','iva','total a pagar','total','ultima act','proveedor'];

  for (const row of rows) {
    const nonEmpty = row.filter(c => (c || '').trim()).length;
    if (nonEmpty === 0) continue;
    const normRow = row.map(normalize);

    // 1. ¿Header de tabla? (acepta "Modelo" o "Código")
    const hasCode = normRow.some(c => c.includes('codigo') || c.includes('modelo'));
    const hasDesc = normRow.some(c => c.includes('producto') || c.includes('descrip') || c.includes('servicio'));
    const hasCost = normRow.some(c => c.includes('costo'));
    if (hasCode && hasDesc && hasCost) {
      colMap = {
        code: normRow.findIndex(c => c.includes('codigo') || c.includes('modelo')),
        desc: normRow.findIndex(c => c.includes('producto') || c.includes('descrip') || c.includes('servicio')),
        cost: normRow.findIndex(c => c.includes('costo')),
        // PVP sin IVA = "Precio/Und" (NO "margen", NO "total")
        pvp: normRow.findIndex(c => c.includes('precio') && !c.includes('total')),
        date: normRow.findIndex(c => c.includes('actualiz') || c.includes('ultima') || c.includes('ult act') || c.includes('fecha')),
        supplier: normRow.findIndex(c => c.includes('proveedor')),
      };
      if (colMap.pvp === -1) colMap.pvp = normRow.findIndex(c => c.includes('pvp') || c.includes('venta'));
      continue;
    }

    // 2. ¿Fila de datos? (tiene número válido en columna costo + descripción)
    if (colMap) {
      const costVal = parseFloat((row[colMap.cost] || '').replace(/[^\d.-]/g, ''));
      const descVal = (row[colMap.desc] || '').trim();
      if (!isNaN(costVal) && costVal > 0 && descVal.length >= 4) {
        let pvp35 = colMap.pvp !== -1 ? parseFloat((row[colMap.pvp] || '').replace(/[^\d.-]/g, '')) : NaN;
        if (isNaN(pvp35) || pvp35 <= 0) pvp35 = +(costVal * 1.35).toFixed(2);
        const dateRaw = colMap.date !== -1 ? (row[colMap.date] || '').trim() : '';
        let lastUpdate = null, daysOld = null;
        const dm = dateRaw.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/) || dateRaw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (dm) {
          let y, m, d;
          if (/^\d{4}/.test(dm[0])) { y = +dm[1]; m = +dm[2]; d = +dm[3]; }
          else { d = +dm[1]; m = +dm[2]; y = +dm[3]; if (y < 100) y += 2000; }
          lastUpdate = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          daysOld = Math.floor((today - new Date(y, m-1, d)) / 86400000);
        }
        const code = colMap.code !== -1 ? (row[colMap.code] || '').trim() : '';
        const supplier = colMap.supplier !== -1 ? (row[colMap.supplier] || '').trim() : '';
        const isService = /servicio|instalacion|instalación|mantenimiento|mano de obra|viatic/i.test(currentCategory);
        items.push({
          code: (code === '(s/c)' || code === '\u2014') ? '' : code,
          category: currentCategory,
          description: descVal,
          cost: costVal,
          pvp35: pvp35,
          pvp15: +(costVal * 1.15).toFixed(2),
          lastUpdate: lastUpdate,
          daysOld: daysOld,
          supplier: supplier === '\u2014' ? '' : supplier,
          isService: isService,
          unit: 'u',
        });
        continue;
      }
    }

    // 3. Header de categoría (cualquier otra fila con texto significativo)
    let catText = '';
    for (const cell of row) {
      const c = (cell || '').trim();
      if (c.length > catText.length && !c.match(/^[\d.,$\s]+$/) && !c.startsWith('@')) {
        const nc = normalize(c);
        if (!COL_NAMES.includes(nc) && !nc.includes('considerar margen')) {
          catText = c;
        }
      }
    }
    if (catText) currentCategory = catText;
  }
  return items;
}

// === SYNC PRINCIPAL ===
// === CLICK EN EL STATUS ===
// Si hay URL configurada y la app está hospedada (no file://), intenta sync directo.
// Si no, abre el modal para cargar manualmente.
function handleSyncClick() {
  const c = getConfig();
  const isLocal = location.protocol === 'file:';
  if (c.driveUrl && !isLocal) {
    syncCatalog(false);
  } else {
    openDriveModal();
  }
}

async function syncCatalog(silent) {
  const c = getConfig();
  if (!c.driveUrl) {
    if (silent) return;
    openDriveModal();
    return;
  }

  const status = $('syncStatus');
  status.classList.add('syncing');
  status.classList.remove('error', 'success');
  $('syncLabel').textContent = 'Actualizando…';

  try {
    const text = await fetchCsv(c.driveUrl);
    const items = parseCatalogFromCSV(text);
    if (items.length === 0) throw new Error('No se detectaron productos en el archivo');

    CATALOG.length = 0;
    items.forEach(i => CATALOG.push(i));
    localStorage.setItem('custom_catalog', JSON.stringify(items));

    c.lastSync = new Date().toISOString();
    setConfig(c);

    // Refrescar UI
    $('categoryFilter').innerHTML = '<option value="">Todas las categorías</option>';
    renderCategories();
    renderCatalog();
    status.classList.remove('syncing');
    status.classList.add('success');
    updateSyncStatus();

    if (!silent) toast('✓ Catálogo actualizado: ' + items.length + ' ítems', 'success');
    setTimeout(() => status.classList.remove('success'), 3000);
  } catch(e) {
    status.classList.remove('syncing');
    status.classList.add('error');
    $('syncLabel').textContent = 'Error en sync';
    if (!silent) toast('Error: ' + e.message, 'danger');
    setTimeout(() => { status.classList.remove('error'); updateSyncStatus(); }, 4000);
  }
}

function updateSyncStatus() {
  const c = getConfig();
  const hasCustom = !!localStorage.getItem('custom_catalog');
  if (!c.lastSync && !hasCustom) {
    $('syncIcon').textContent = '📥';
    $('syncLabel').textContent = 'Actualizar catálogo';
    return;
  }
  if (!c.lastSync) {
    $('syncIcon').textContent = '🔄';
    $('syncLabel').textContent = 'Actualizar catálogo';
    return;
  }
  const last = new Date(c.lastSync);
  const ageMs = Date.now() - last.getTime();
  const ageHours = Math.floor(ageMs / 3600000);
  const ageDays = Math.floor(ageHours / 24);
  let label;
  if (ageHours < 1) {
    label = 'Catálogo actualizado hoy';
    $('syncIcon').textContent = '✓';
  } else if (ageHours < 24) {
    label = `Actualizado hace ${ageHours}h`;
    $('syncIcon').textContent = '✓';
  } else if (ageDays === 1) {
    label = 'Actualizado ayer · click para actualizar';
    $('syncIcon').textContent = '🔄';
  } else {
    label = `Actualizado hace ${ageDays} días · click para actualizar`;
    $('syncIcon').textContent = '🔄';
  }
  $('syncLabel').textContent = label;
}

// === AUTO-SYNC AL ABRIR ===
function shouldAutoSync() {
  const c = getConfig();
  if (!c.driveUrl) return false;
  if (location.protocol === 'file:') return false; // fetch bloqueado en archivos locales
  if (!c.lastSync) return true;
  const ageMs = Date.now() - new Date(c.lastSync).getTime();
  return ageMs > 24 * 3600 * 1000; // 24 horas
}

// === RESET CATÁLOGO ===
function resetCatalog() {
  if (!confirm('¿Restaurar el catálogo original embebido y eliminar la configuración del Drive?')) return;
  localStorage.removeItem('custom_catalog');
  const c = getConfig();
  delete c.lastSync;
  setConfig(c);
  location.reload();
}

// === CARGAR CATÁLOGO PERSONALIZADO AL INICIO ===
function loadCustomCatalogIfExists() {
  const raw = localStorage.getItem('custom_catalog');
  if (!raw) return false;
  try {
    const custom = JSON.parse(raw);
    if (custom.length > 0) {
      CATALOG.length = 0;
      custom.forEach(i => CATALOG.push(i));
      return true;
    }
  } catch(e) {}
  return false;
}

// === AUTENTICACIÓN ===
// Funciones importadas desde src/modules/auth.js (doLogin, validateSession, logout)

function enterApp(session) {
  currentSession = session;
  $('loginOverlay').classList.add('hidden');
  $('userChipName').textContent = session.nombre || session.user;
  $('loginBtn').disabled = false;
  $('loginBtn').textContent = 'Ingresar';
  bootApp();
}

window._enterApp = enterApp;

// === ARRANQUE DE LA APP (tras login) ===
function bootApp() {
  // Cargar catálogo personalizado si existe
  loadCustomCatalogIfExists();
  renderCategories();
  updateSyncStatus();

  $('search').addEventListener('input', renderCatalog);
  $('categoryFilter').addEventListener('change', renderCatalog);
  document.querySelectorAll('.quote-panel input, .quote-panel textarea').forEach(el => {
    el.addEventListener('change', saveDraft);
  });
  document.querySelectorAll('#clientName,#clientRuc,#clientAddress,#clientContact,#clientPhone,#clientEmail,#cotNum,#cotDate').forEach(el => {
    el.addEventListener('input', syncPrintView);
  });

  const raw = localStorage.getItem('quote_draft');
  if (raw) {
    try {
      const draft = JSON.parse(raw);
      if (draft.items && draft.items.length > 0) loadQuoteData(draft);
    } catch(e) {}
  }
  if (!$('cotNum').value) $('cotNum').value = generateCotNumber();
  if (!$('cotDate').value) $('cotDate').value = new Date().toISOString().split('T')[0];

  renderCatalog();
  renderCart();
  syncPrintView();
  applyEmpresaHeader();

  // Auto-sync diaria del catálogo (solo si hay URL y no es local)
  if (shouldAutoSync()) {
    setTimeout(() => syncCatalog(true), 1500);
  }
}

// El encabezado del PDF es fijo (logo GEMESEG + teléfono), no requiere lógica.
function applyEmpresaHeader() {}

// === INIT ===
// Inicialización manejada por src/main.js

// Exponer funciones al scope global para onclick en HTML
window.setModality = setModality;
window.handleSyncClick = handleSyncClick;
window.openSavedModal = openSavedModal;
window.closeSavedModal = closeSavedModal;
window.newQuote = newQuote;
window.saveQuote = saveQuote;
window.loadDraft = loadDraft;
window.openDriveModal = openDriveModal;
window.closeDriveModal = closeDriveModal;
window.switchSyncTab = switchSyncTab;
window.importLocalCsv = importLocalCsv;
window.testAndSaveUrl = testAndSaveUrl;
window.resetCatalog = resetCatalog;
