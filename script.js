(() => {
  const QUIZ_LENGTH = 10;
  const HINT_TOKEN_REWARD_STREAK = 3;
  const DIFFICULTY_LEVELS = ['easy','medium','hard'];

  const startBtn = document.getElementById('startBtn');
  const quizBox = document.getElementById('quiz-box');
  const resultBox = document.getElementById('result-box');
  const questionEl = document.getElementById('question');
  const optionsEl = document.getElementById('options');
  const difficultyLabel = document.getElementById('difficulty-label');
  const timerEl = document.getElementById('timer');
  const streakEl = document.getElementById('streak');
  const tokensEl = document.getElementById('tokens');
  const useHintBtn = document.getElementById('useHint');
  const reactionEl = document.getElementById('reaction');
  const resultText = document.getElementById('result-text');
  const canvas = document.getElementById('skillGraph');

  let questionPool = {easy:[],medium:[],hard:[]};
  let askedQuestions = [];
  let currentQuestion = null;
  let currentDifficulty = 'easy';
  let questionIndex = 0;
  let correctCount = 0;
  let streak = 0;
  let tokens = 0;
  let questionStartTime = 0;
  let thinkTimerStarted = false;
  let reactionLog = [];
  let difficultyProgress = [];
  let timerInterval = null;

  questionPool.easy = [
    {id:'e1',q:'What does HTML stand for?',options:['HyperText Markup Language','Home Tool Markup Language','Hyperlinks and Text Markup','Hyper Transfer Markup Language'],answerIndex:0,tags:['web']},
    {id:'e2',q:'Which tag creates a paragraph in HTML?',options:['<p>','<para>','<text>','<paragraph>'],answerIndex:0,tags:['web']},
    {id:'e3',q:'Binary system uses which digits?',options:['0 and 1','0 to 9','1 to 2','A and B'],answerIndex:0,tags:['basics']}
  ];

  questionPool.medium = [
    {id:'m1',q:'Which CSS property changes text color?',options:['color','font-color','text-color','fg-color'],answerIndex:0,tags:['css']},
    {id:'m2',q:'Which JS keyword declares block variable?',options:['let','var','constonly','static'],answerIndex:0,tags:['js']},
    {id:'m3',q:'Binary search complexity?',options:['O(log n)','O(n)','O(n log n)','O(1)'],answerIndex:0,tags:['ds']}
  ];

  questionPool.hard = [
    {id:'h1',q:'Which signal used in synchronous serial?',options:['Clock','Ready','Ack','CTS'],answerIndex:0,tags:['embedded']},
    {id:'h2',q:'PLL function?',options:['Locks phase','Amplifies','ADC','Filters noise'],answerIndex:0,tags:['electronics']},
    {id:'h3',q:'Shortest path with non-negative weights?',options:['Dijkstra','Bellman-Ford','Prim','Kruskal'],answerIndex:0,tags:['algorithms']}
  ];

  function rand(a){return a[Math.floor(Math.random()*a.length)]}
  function diff(a,b){return Math.max(0,Math.round((b-a)/1000))}
  function capitalize(s){return s.charAt(0).toUpperCase()+s.slice(1)}
  function difficultyToNum(d){return DIFFICULTY_LEVELS.indexOf(d)+1}

  function updateDifficulty(correct,time){
    let i = DIFFICULTY_LEVELS.indexOf(currentDifficulty);
    if(correct){
      if(time<=8 && i<2) currentDifficulty=DIFFICULTY_LEVELS[i+1];
      else if(time<=12 && i<2 && Math.random()>0.5) currentDifficulty=DIFFICULTY_LEVELS[i+1];
    } else {
      if(i>0) currentDifficulty=DIFFICULTY_LEVELS[i-1];
    }
    difficultyLabel.textContent='Difficulty: '+capitalize(currentDifficulty);
  }

  function pickQuestion(){
    const pool = questionPool[currentDifficulty].filter(q=>!askedQuestions.includes(q.id));
    if(pool.length===0){
      const all=[...questionPool.easy,...questionPool.medium,...questionPool.hard].filter(q=>!askedQuestions.includes(q.id));
      if(all.length===0) return null;
      return rand(all);
    }
    return rand(pool);
  }

  function startTimerDisplay(){
    if(timerInterval) clearInterval(timerInterval);
    timerInterval=setInterval(()=>{
      if(!questionStartTime) return;
      timerEl.textContent='⏱ '+diff(questionStartTime,Date.now())+'s';
    },400);
  }

  function stopTimerDisplay(){
    clearInterval(timerInterval);
    timerInterval=null;
  }

  useHintBtn.addEventListener('click',()=>{
    if(tokens<=0||!currentQuestion) return;
    tokens--;
    tokensEl.textContent='🎁 Tokens: '+tokens;
    const btns=Array.from(optionsEl.querySelectorAll('button'));
    const correctIndex=currentQuestion.answerIndex;
    const wrong=btns.filter(b=>parseInt(b.dataset.index)!=correctIndex);
    shuffle(wrong);
    let remove=wrong.slice(0,Math.max(1,wrong.length-1));
    remove.forEach(b=>{b.disabled=true;b.style.visibility='hidden'});
    useHintBtn.classList.add('hidden');
  });

  function shuffle(a){
    for(let i=a.length-1;i>0;i--){
      let j=Math.floor(Math.random()*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
  }

  function reactionEmoji(correct,time){
    if(correct){
      if(time<=6) return '😎';
      if(time>12) return '🤔';
      return '🙂';
    } else {
      if(time<=3) return '😂';
      return '😐';
    }
  }

  function onOptionClick(e){
    const btn=e.currentTarget;
    const idx=parseInt(btn.dataset.index);
    optionsEl.querySelectorAll('button').forEach(b=>b.disabled=true);
    stopTimerDisplay();
    const time=questionStartTime?diff(questionStartTime,Date.now()):0;
    thinkTimerStarted=false;
    const correct = idx===currentQuestion.answerIndex;

    if(correct){
      btn.classList.add('correct');
      correctCount++;
      streak++;
      if(streak>0&&streak%HINT_TOKEN_REWARD_STREAK===0){
        tokens++;
        tokensEl.textContent='🎁 Tokens: '+tokens;
        useHintBtn.classList.remove('hidden');
      }
    } else {
      btn.classList.add('wrong');
      const btns=optionsEl.querySelectorAll('button');
      const c=Array.from(btns).find(b=>parseInt(b.dataset.index)===currentQuestion.answerIndex);
      if(c) c.classList.add('correct');
      streak=0;
    }

    reactionEl.textContent = reactionEmoji(correct,time);
    reactionLog.push({difficulty:currentDifficulty,correct,timeTaken:time,index:questionIndex});
    difficultyProgress.push(difficultyToNum(currentDifficulty));
    updateDifficulty(correct,time);
    streakEl.textContent='🔥 Streak: '+streak;

    setTimeout(()=>{
      questionIndex++;
      askedQuestions.push(currentQuestion.id);
      if(questionIndex>=QUIZ_LENGTH) endQuiz();
      else loadNextQuestion();
    },900);
  }

  function showQuestion(q){
    optionsEl.innerHTML='';
    reactionEl.textContent='';
    questionEl.textContent=q.q;
    q.options.forEach((opt,i)=>{
      const b=document.createElement('button');
      b.dataset.index=i;
      b.dataset.qid=q.id;
      b.textContent = String.fromCharCode(65+i)+'. '+opt;
      const startThink=()=>{
        if(!thinkTimerStarted){
          thinkTimerStarted=true;
          questionStartTime=Date.now();
          startTimerDisplay();
        }
      };
      b.addEventListener('mouseenter',startThink);
      b.addEventListener('touchstart',startThink,{passive:true});
      b.addEventListener('click',onOptionClick);
      optionsEl.appendChild(b);
    });
  }

  function startQuiz(){
    askedQuestions = [];
    reactionLog = [];
    difficultyProgress = [];
    questionIndex = 0;
    correctCount = 0;
    streak = 0;
    tokens = 0;
    currentDifficulty = 'easy';

    difficultyLabel.textContent = 'Difficulty: Beginner';
    startBtn.classList.add('hidden');
    resultBox.classList.add('hidden');
    quizBox.classList.remove('hidden');

    questionStartTime = 0;
    thinkTimerStarted = false;

    streakEl.textContent = '🔥 Streak: 0';
    tokensEl.textContent = '🎁 Tokens: 0';
    timerEl.textContent = '⏱ 0s';

    loadNextQuestion();
  }

  function loadNextQuestion(){
    currentQuestion=pickQuestion();
    if(!currentQuestion){endQuiz();return;}
    if(tokens>0) useHintBtn.classList.remove('hidden');
    else useHintBtn.classList.add('hidden');
    showQuestion(currentQuestion);
    difficultyLabel.textContent='Difficulty: '+capitalize(currentDifficulty);
    timerEl.textContent='⏱ 0s';
    questionStartTime=0;
    thinkTimerStarted=false;
  }

  function endQuiz(){
    stopTimerDisplay();
    quizBox.classList.add('hidden');
    resultBox.classList.remove('hidden');

    const total=reactionLog.length;
    const acc=Math.round((correctCount/Math.max(1,total))*100);
    const avgTime=Math.round(reactionLog.reduce((s,r)=>s+r.timeTaken,0)/Math.max(1,total));

    const wrongs=reactionLog.filter(r=>!r.correct);
    const tagCount={};
    wrongs.forEach(w=>{
      const q=findQuestion(w.index,w.difficulty);
      if(!q) return;
      (q.tags||[]).forEach(t=>{tagCount[t]=(tagCount[t]||0)+1});
    });

    const worst=Object.entries(tagCount).sort((a,b)=>b[1]-a[1]).slice(0,3).map(t=>t[0]);
    resultText.innerHTML=`<strong>Score:</strong> ${correctCount}/${total} (${acc}%)<br>
    <strong>Avg Time:</strong> ${avgTime}s<br>
    <strong>Tokens left:</strong> ${tokens}<br>
    <strong>Weak Areas:</strong> ${worst.length?worst.join(', '):'None'}`;

    drawGraph(canvas,difficultyProgress,reactionLog.map(r=>r.correct?1:0));
    startBtn.classList.remove('hidden');
  }

  function findQuestion(i,d){
    const all=[...questionPool.easy,...questionPool.medium,...questionPool.hard];
    return all.find(q=>q.id===askedQuestions[i]);
  }

  function drawGraph(c,ds,cs){
    const ctx=c.getContext('2d');
    const w=c.width=Math.min(420,window.innerWidth-60);
    const h=c.height=240;
    ctx.fillStyle='rgba(255,255,255,0.03)';
    ctx.fillRect(0,0,w,h);
    const pad=30;
    const pw=w-pad*2;
    const ph=h-pad*2;
    const n=ds.length;
    const sx=pw/Math.max(1,n-1);

    ctx.strokeStyle='rgba(255,255,255,0.05)';
    for(let i=0;i<4;i++){
      let y=pad+(ph/3)*i;
      ctx.beginPath();
      ctx.moveTo(pad,y);
      ctx.lineTo(w-pad,y);
      ctx.stroke();
    }

    ctx.beginPath();
    for(let i=0;i<ds.length;i++){
      let x=pad+i*sx;
      let y=pad+ph-((ds[i]-1)/2)*ph;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }
    ctx.strokeStyle='rgba(95,133,255,0.95)';
    ctx.lineWidth=3;
    ctx.stroke();

    for(let i=0;i<cs.length;i++){
      let x=pad+i*sx;
      let y=pad+ph-((ds[i]-1)/2)*ph;
      ctx.beginPath();
      ctx.arc(x,y,6,0,Math.PI*2);
      ctx.fillStyle = cs[i]?'rgba(48,206,104,0.95)':'rgba(255,91,91,0.95)';
      ctx.fill();
      ctx.strokeStyle='rgba(0,0,0,0.15)';
      ctx.stroke();
    }

    ctx.fillStyle='rgba(255,255,255,0.85)';
    ctx.font='13px Poppins';
    ctx.fillText('Difficulty progression (1=Easy, 3=Hard)',pad,18);
  }

  startBtn.addEventListener('click',startQuiz);
})();
