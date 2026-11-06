/* Selected records from the authenticated agent review API, read 2026-11-05.
   No signed URLs or credentials. This is a curated extract, not the full trace. */
const EPISODE = {
  id: 'f316a723-8f24-4ea5-a99e-7d32eeca6784',
  duration: 1816.8000345230105, fps: 30, lastFrame: 2788,
  counts: { model: 90, tool: 102, robot: 53, context: 1, summaries: 14, states: 2790 },
  portal: 'https://eval-portal-ulz574edeq-ey.a.run.app/episodes/f316a723-8f24-4ea5-a99e-7d32eeca6784',
  states: [
    {t:0,frame:0,step:0,left:false,right:false,goal:null},
    {t:73.47723937034607,frame:0,step:1,left:false,right:false,goal:false},
    {t:553.9374530315399,frame:713,step:714,left:true,right:false,goal:false},
    {t:1089.135734796524,frame:1443,step:1444,left:true,right:true,goal:false},
    {t:1098.3207185268402,frame:1454,step:1455,left:false,right:true,goal:false},
    {t:1814.4196746349337,frame:2788,step:2789,left:false,right:true,goal:true}
  ],
  // Robot span boundaries and video anchors, rounded to 0.01 wall seconds.
  robot: `43.64,43.75,0
73.31,76.79,0
112.12,117.55,42
150.22,159.64,114
191.48,193.54,240
215.64,221.21,266
257.69,258.92,339
288.39,289.46,354
317.19,322.02,367
454.88,458.31,431
474.49,481.85,475
497.74,503.71,573
520.47,522.52,652
536.59,538.2,678
552.68,554.66,698
567.44,569.57,721
584.42,588.92,748
674.84,684.09,807
863.06,865.55,928
894.74,902.91,959
941.39,949.41,1065
957.95,962.95,1169
972.52,977.73,1234
1002.84,1004.47,1302
1050.97,1052.32,1322
1066.73,1071.62,1338
1078.71,1080.58,1401
1087.52,1089.96,1424
1098.05,1098.82,1452
1105.14,1106.43,1459
1133.6,1143.34,1474
1156.84,1159.29,1601
1172.41,1176.94,1632
1190.23,1200.7,1690
1212.04,1220.4,1825
1229.45,1234.29,1932
1300.41,1306.04,1993
1317.7,1339.01,2065
1421.55,1427.08,2341
1440.29,1448.24,2411
1459.88,1462.26,2513
1476.26,1478.27,2543
1491.9,1493.91,2568
1512.32,1513.97,2593
1525.18,1526.85,2613
1538.72,1539.97,2633
1551.87,1553.13,2648
1581.54,1582.82,2663
1594.43,1596.01,2678
1620.9,1621.93,2697
1655.13,1657.33,2709
1763.95,1766.28,2736
1808.42,1816.8,2765`.split('\n').map((r,i)=>{const [t,end,frame]=r.split(',').map(Number);return {id:`robot-${i+1}`,t,end,frame,kind:'robot',title:`Robot activity ${i+1}`,status:i===52?'Acknowledgement unknown':'Complete'};}),
  summaries: [
    ['0d569097-524f-48b5-8e82-80459b639bf1',193.72354364395144,215.58154368400577,266,'Evaluating movement adjustments','I need to adjust my direction by turning left another 45 degrees after checking the drift guard since it doesn\'t automatically retry.'],
    ['2191ae47-42e6-47cc-bcf4-c7b104761586',322.2475435733795,358.0275435447693,431,'Evaluating logo placement','I’m figuring out if the logo needs to be oriented correctly.'],
    ['508dc410-e122-42e0-aacc-a9106be2ff44',458.5235435962677,474.37954354286194,475,'Assessing layout and spacing','I\'m thinking about the layout of the flat surface near the edge and how the counter lip might affect it.'],
    ['3f1cbbe2-b4ec-4f96-84c1-33d471e6264e',657.7385437488556,674.7795436382294,807,'Interpreting joint movement','I need to choose a path for the current arm movement based on the rotation.'],
    ['91fa9b73-1a6c-450f-bde7-9a755906a278',865.6845436096191,872.9005436897278,959,'Figuring out print issues','I’m dealing with some printing problems. It seems like the time is running out, and I have about 2700 walls left to print.'],
    ['7ef76d8b-a5fd-4d8c-812a-5b423efb6fe8',887.4295437335968,894.6745436191559,959,'Evaluating rotation and movement','I\'m thinking about the rotation from -1.13 to +1.46 and how it needs to roll to about +1.46 to 2.6 radians within the joints.'],
    ['0081a906-36cb-40e8-9985-de5de112e3fa',903.0715436935424,916.7095437049866,1065,'Solving geometric rotation issues','Okay, I\'ve flipped the object upside down! It seems I need to rotate it 180 degrees to correct its orientation.'],
    ['8ea3bbab-c7b7-4ffa-b324-f239ebb05b8f',963.1815435886384,972.4595437049866,1234,'Adjusting target parameters','I\'ve noticed that the q7 target changed from -0.9 to -0.55 automatically, which feels a bit strange.'],
    ['98b5999a-698c-4aeb-a93b-68833b90f535',1177.1525435447693,1190.163543701172,1690,'Mapping the Steps','My target is a blank wall behind us, opposite the stove, near the window and door pillar on the right.'],
    ['f3374992-4dbd-4551-9970-78dd984c9093',1234.4865436553955,1245.9545435905457,1993,'Figuring out nail placement','I’ll also look at old successful examples saved in my archived geometry for some reference poses.'],
    ['4b4603cb-5f67-433d-948c-453d896df80b',1245.960543632507,1255.90554356575,1993,'Evaluating file paths','I\'m thinking about whether old references might have absolute paths that aren\'t valid anymore.'],
    ['b1ebe5ea-6bd3-40e2-9000-b5e75cb28da4',1268.692543745041,1279.4735436439514,1993,'Exploring geometric alignment','I\'m considering how to recover from the archive actual receipts if the dataset is mapped.'],
    ['56b2e290-40b8-4820-a867-32fe6f2646c9',1389.966543674469,1406.6395435333252,2341,'Assessing fit and safety','There\'s another choice that may fit better, shifting the torso inward, but I’m unsure about the exact adjustments.'],
    ['795fb503-6518-4869-943f-c1da773368c4',1478.4915435314178,1491.8375437259674,2568,'Evaluating fit calculations','I notice a surprisingly different gap: 13 cm instead of the expected 7 cm.']
  ].map(([id,t,end,frame,title,excerpt])=>({id:`model:${id}`,t,end,frame,title,excerpt,kind:'summary'})),
  context: {id:'context-update',t:684.29,end:848.04,frame:928,kind:'context',title:'Context span'},
  chapters: [
    {id:'orient',title:'Orient',t:193.72354364395144,frame:266,event:'model:0d569097-524f-48b5-8e82-80459b639bf1',headline:'Find an approach to the picture.',note:'The returned summary discusses another left turn and checks against a drift guard. This is a recorded plan, not proof that the move succeeded.'},
    {id:'grasp',title:'Grasp',t:553.9374530315399,frame:713,event:'state-714',headline:'The left hand acquires the poster.',note:'The evaluator first records the poster in the left gripper at step 714. This establishes a grasp-state change; it does not reveal what the agent knew.'},
    {id:'reorient',title:'Reorient',t:903.0715436935424,frame:1065,event:'model:0081a906-36cb-40e8-9985-de5de112e3fa',headline:'A rotation needs another look.',note:'The returned summary describes an upside-down object and proposes a correction. Check the matching video frame before treating the description as visual ground truth.'},
    {id:'transfer',title:'Transfer',t:1098.3207185268402,frame:1454,event:'state-1455',headline:'The poster passes to the right hand.',note:'Evaluator records show both grippers holding the poster at step 1444, then only the right at step 1455. This chapter is based on those two state transitions.'},
    {id:'reference',title:'Reference',t:1234.4865436553955,frame:1993,event:'model:f3374992-4dbd-4551-9970-78dd984c9093',headline:'Consult earlier alignment examples.',note:'Three returned summaries at the same frame discuss the nail, archived examples, and alignment geometry. The simulation frame stays fixed while wall time advances.'},
    {id:'align',title:'Align',t:1478.4915435314178,frame:2568,event:'model:795fb503-6518-4869-943f-c1da773368c4',headline:'Reconsider the remaining gap.',note:'The returned summary reports a gap larger than expected and discusses another small adjustment. The numbers are model-reported estimates, not evaluator measurements.'},
    {id:'finish',title:'Finish',t:1814.4196746349337,frame:2788,event:'state-2789',headline:'Task success, with an unresolved acknowledgement.',note:'The evaluator records the attachment goal as satisfied. The last robot call ends with an unknown acknowledgement. Preserve both outcomes instead of treating that call status as task failure.'}
  ]
};
