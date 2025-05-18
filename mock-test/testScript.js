let currentQuestionIndex = 0;
let currentSectionIndex = 0;
let currentTestIndex = 0;
let allSections = [];
let allQuestions = [];
let userAnswers = {}; // key: testIndex_sectionIndex_questionIndex
let sectionTimers = [];
let timerInterval;
let timeSpent = 0; // Track time spent on the test

// Load the test data from the JSON file
document.addEventListener('DOMContentLoaded', function() {
  fetch("json-structure.json")
    .then((res) => res.json())
    .then((data) => {
      initializeTest(data);
    })
    .catch(error => {
      console.error("Error loading test data:", error);
      document.getElementById("question-container").innerHTML = 
        "<div class='error'>Failed to load test data. Please refresh the page.</div>";
    });
});

function initializeTest(data) {
  const tests = data.tests;
  if (!tests || tests.length === 0) {
    console.error("No tests found in the data");
    return;
  }
  
  // Save test data to localStorage for reference in results page
  localStorage.setItem("testData", JSON.stringify(data));
  
  // Set current test to the first one
  const currentTest = tests[currentTestIndex];
  
  // Get all sections from the current test
  allSections = currentTest.sections;
  
  // Get time limits for all sections
  sectionTimers = allSections.map(section => section.timeLimit || 1200); // Default 20 minutes if not specified
  
  // Display test title
  document.getElementById("test-title").innerText = currentTest.title || "GRE Mock Test";
  
  // Reset time spent
  timeSpent = 0;
  localStorage.removeItem("testTimeTaken");
  
  // Load the first section
  loadSection(0);
}

function loadSection(sectionIdx) {
  clearInterval(timerInterval);
  currentSectionIndex = sectionIdx;
  const section = allSections[sectionIdx];
  allQuestions = [];
  
  // Get section title
  const sectionTitle = section.title || `Section ${sectionIdx + 1}`;
  document.getElementById("section-title").innerText = sectionTitle;
  
  // Process all questions from all parts in this section
  section.parts.forEach((part) => {
    if (part.questions) {
      part.questions.forEach((q) => {
        // Create a copy of the question and add necessary data
        const questionCopy = { 
          ...q, 
          passage: part.passage || null, 
          index: allQuestions.length,
          type: q.type || part.type, // Use question type if available, otherwise use part type
          sectionIndex: sectionIdx // Store the section index with the question
        };
        allQuestions.push(questionCopy);
      });
    }
  });

  currentQuestionIndex = 0;
  createSidebar();
  renderQuestion(currentQuestionIndex);
  startTimer();
  updateProgressInfo();
}

function createSidebar() {
  const list = document.getElementById("question-list");
  list.innerHTML = "";
  
  allQuestions.forEach((q, i) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.innerText = `Q${i + 1}`;
    btn.className = "question-btn";
    btn.id = `question-btn-${i}`;
    
    // Check if question has been answered
    const key = `${currentTestIndex}_${currentSectionIndex}_${i}`;
    if (userAnswers[key] && userAnswers[key].length > 0) {
      btn.classList.add("answered");
    }
    
    btn.onclick = () => {
      saveAnswer(currentQuestionIndex);
      currentQuestionIndex = i;
      renderQuestion(i);
    };
    
    li.appendChild(btn);
    list.appendChild(li);
  });
}

function updateQuestionButtonStatus(index) {
  const btn = document.getElementById(`question-btn-${index}`);
  if (!btn) return;
  
  const key = `${currentTestIndex}_${currentSectionIndex}_${index}`;
  if (userAnswers[key] && userAnswers[key].length > 0) {
    btn.classList.add("answered");
  } else {
    btn.classList.remove("answered");
  }
}

function renderQuestion(index) {
  if (index < 0 || index >= allQuestions.length) {
    console.error("Invalid question index:", index);
    return;
  }
  
  const q = allQuestions[index];
  const container = document.getElementById("question-container");
  container.innerHTML = "";
  
  // Create question container
  const questionContainer = document.createElement("div");
  questionContainer.className = "question-container";
  
  // Add passage if exists
  if (q.passage) {
    const passageDiv = document.createElement("div");
    passageDiv.className = "passage";
    passageDiv.innerHTML = `${q.passage}</p>`;
    questionContainer.appendChild(passageDiv);
  }
  
  // Create questions area
  const questionsDiv = document.createElement("div");
  questionsDiv.className = "questions";
  
  // Question title
  const titleDiv = document.createElement("div");
  titleDiv.className = "question-title";
  titleDiv.innerHTML = `<h3>Question ${index + 1}</h3><p>${q.question}</p>`;
  questionsDiv.appendChild(titleDiv);
  
  // Options area
  const optionsDiv = document.createElement("div");
  optionsDiv.className = q.passage ? "options passage-options" : "options";

  
  // Get saved answer if it exists
  const key = `${currentTestIndex}_${currentSectionIndex}_${index}`;
  const savedAnswers = userAnswers[key] || [];
  
  // Render question based on type
  if (q.type === "text-completion") {
    // For text completion questions
    if (q.blanks && q.blanks.length > 0) {
      q.blanks.forEach((blank, bIndex) => {
        const blankDiv = document.createElement("div");
        blankDiv.className = "blank-options";
        
        // Add blank label if present
        if (blank.label) {
          blankDiv.innerHTML = `<h4>Blank ${blank.label}</h4>`;
        }
        
        // Create radio button group for each blank
        const optionsGroup = document.createElement("div");
        optionsGroup.className = "options-group";
        
        blank.options.forEach((opt) => {
          const id = `q${index}_b${bIndex}_${opt.replace(/\s/g, '_')}`;
          
          const optionDiv = document.createElement("div");
          optionDiv.className = "option";
          
          const input = document.createElement("input");
          input.type = "radio";
          input.name = `q${index}_b${bIndex}`;
          input.id = id;
          input.value = opt;
          
          // Check if this option was previously selected
          if (savedAnswers[bIndex] === opt) {
            input.checked = true;
          }
          
          const label = document.createElement("label");
          label.htmlFor = id;
          label.textContent = opt;
          
          optionDiv.appendChild(input);
          optionDiv.appendChild(label);
          optionsGroup.appendChild(optionDiv);
        });
        
        blankDiv.appendChild(optionsGroup);
        optionsDiv.appendChild(blankDiv);
      });
    }
  } else if (q.type === "sentence-equivalence") {
    // For sentence equivalence questions (CHANGED: now using checkboxes instead of radio buttons)
    if (q.blanks && q.blanks.length > 0) {
      q.blanks.forEach((blank, bIndex) => {
        const blankDiv = document.createElement("div");
        blankDiv.className = "blank-options";
        
        // Add blank label if present
        if (blank.label) {
          blankDiv.innerHTML = `<h4>Blank ${blank.label}</h4>`;
        }
        
        // Add instruction for sentence equivalence questions
        const instruction = document.createElement("p");
        instruction.className = "se-instruction";
        instruction.textContent = "Select exactly 2 words that create sentences with similar meanings when used in the blank.";
        blankDiv.appendChild(instruction);
        
        // Create checkbox group for each blank
        const optionsGroup = document.createElement("div");
        optionsGroup.className = "options-group";
        
        blank.options.forEach((opt) => {
          const id = `q${index}_b${bIndex}_${opt.replace(/\s/g, '_')}`;
          
          const optionDiv = document.createElement("div");
          optionDiv.className = "option";
          
          const input = document.createElement("input");
          input.type = "checkbox";
          input.name = `q${index}_b${bIndex}`;
          input.id = id;
          input.value = opt;
          
          // Check if this option was previously selected
          if (savedAnswers[bIndex] && savedAnswers[bIndex].includes(opt)) {
            input.checked = true;
          }
          
          const label = document.createElement("label");
          label.htmlFor = id;
          label.textContent = opt;
          
          optionDiv.appendChild(input);
          optionDiv.appendChild(label);
          optionsGroup.appendChild(optionDiv);
        });
        
        blankDiv.appendChild(optionsGroup);
        optionsDiv.appendChild(blankDiv);
      });
    }
  } else {
    // For reading comprehension (multiple-choice) questions
    const isMultiSelect = q.answer && q.answer.length > 1;
    const inputType = isMultiSelect ? "checkbox" : "radio";
    
    if (q.options && q.options.length > 0) {
      q.options.forEach((opt) => {
        const optionDiv = document.createElement("div");
        optionDiv.className = "option";
        
        const id = `q${index}_${opt.slice(0, 20).replace(/\s/g, '_')}`;
        
        const input = document.createElement("input");
        input.type = inputType;
        input.name = `q${index}`;
        input.id = id;
        input.value = opt;
        
        // Check if this option was previously selected
        if (savedAnswers.includes(opt)) {
          input.checked = true;
        }
        
        const label = document.createElement("label");
        label.htmlFor = id;
        label.textContent = opt;
        
        optionDiv.appendChild(input);
        optionDiv.appendChild(label);
        optionsDiv.appendChild(optionDiv);
      });
    }
  }
  
  questionsDiv.appendChild(optionsDiv);
  questionContainer.appendChild(questionsDiv);
  container.appendChild(questionContainer);
  
  // Update navigation buttons
  updateButtons();
  
  // Highlight current question in sidebar
  document.querySelectorAll(".question-btn").forEach(btn => btn.classList.remove("current"));
  document.getElementById(`question-btn-${index}`)?.classList.add("current");
}

function updateButtons() {
  document.getElementById("prevBtn").disabled = currentQuestionIndex === 0;
  document.getElementById("nextBtn").disabled = currentQuestionIndex === allQuestions.length - 1;
  
  // Show appropriate section button
  const isLastSection = currentSectionIndex === allSections.length - 1;
  document.getElementById("nextSectionBtn").style.display = isLastSection ? "none" : "inline-block";
  document.getElementById("submitBtn").style.display = isLastSection ? "inline-block" : "none";
  
  updateProgressInfo();
}

function updateProgressInfo() {
  // Update question counter
  document.getElementById("question-counter").textContent = 
    `Question ${currentQuestionIndex + 1} of ${allQuestions.length}`;
  
  // Update section info
  document.getElementById("section-info").textContent = 
    `Section ${currentSectionIndex + 1} of ${allSections.length}`;
}

document.getElementById("nextBtn").addEventListener("click", () => {
  saveAnswer(currentQuestionIndex);
  if (currentQuestionIndex < allQuestions.length - 1) {
    currentQuestionIndex++;
    renderQuestion(currentQuestionIndex);
  }
});

document.getElementById("prevBtn").addEventListener("click", () => {
  saveAnswer(currentQuestionIndex);
  if (currentQuestionIndex > 0) {
    currentQuestionIndex--;
    renderQuestion(currentQuestionIndex);
  }
});

document.getElementById("nextSectionBtn").addEventListener("click", () => {
  saveAnswer(currentQuestionIndex);
  
  // Save total time spent so far
  timeSpent += sectionTimers[currentSectionIndex] - parseInt(document.getElementById("timer").textContent.split(":")[0]) * 60 - parseInt(document.getElementById("timer").textContent.split(":")[1]);
  
  // Confirm with user before moving to next section
  const confirmed = confirm("Are you sure you want to move to the next section? You won't be able to return to this section.");
  
  if (confirmed && currentSectionIndex < allSections.length - 1) {
    loadSection(currentSectionIndex + 1);
  }
});

document.getElementById("submitBtn").addEventListener("click", () => {
  saveAnswer(currentQuestionIndex);
  
  // Save final time spent
  timeSpent += sectionTimers[currentSectionIndex] - parseInt(document.getElementById("timer").textContent.split(":")[0]) * 60 - parseInt(document.getElementById("timer").textContent.split(":")[1]);
  localStorage.setItem("testTimeTaken", timeSpent);
  
  // Confirm test submission
  const confirmed = confirm("Are you sure you want to submit the test? This action cannot be undone.");
  
  if (confirmed) {
    finishTest();
  }
});

function saveAnswer(index) {
  const q = allQuestions[index];
  const key = `${currentTestIndex}_${currentSectionIndex}_${index}`;
  
  if (q.type === "text-completion") {
    // For text completion questions with blanks
    if (q.blanks) {
      const ans = [];
      q.blanks.forEach((blank, bi) => {
        const selected = document.querySelector(`input[name="q${index}_b${bi}"]:checked`);
        ans.push(selected ? selected.value : null);
      });
      
      // Only save if at least one answer is selected
      if (ans.some(a => a !== null)) {
        userAnswers[key] = ans;
      }
    }
  } else if (q.type === "sentence-equivalence") {
    // For sentence equivalence questions (CHANGED: handle checkbox values)
    if (q.blanks) {
      const ans = [];
      q.blanks.forEach((blank, bi) => {
        const selected = Array.from(document.querySelectorAll(`input[name="q${index}_b${bi}"]:checked`))
          .map(input => input.value);
        
        // Store the selected values for this blank
        ans.push(selected);
      });
      
      // Only save if at least one answer is selected
      if (ans.some(a => a.length > 0)) {
        userAnswers[key] = ans;
      }
    }
  } else {
    // For multiple choice questions
    const inputs = document.querySelectorAll(`input[name="q${index}"]:checked`);
    const selectedAnswers = Array.from(inputs).map(i => i.value);
    
    // Only save if at least one answer is selected
    if (selectedAnswers.length > 0) {
      userAnswers[key] = selectedAnswers;
    }
  }
  
  // Update the sidebar button status
  updateQuestionButtonStatus(index);
}

function startTimer() {
  const timerEl = document.getElementById("timer");
  let timeLeft = sectionTimers[currentSectionIndex];
  
  updateTimerDisplay(timeLeft);
  
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      
      // Time's up for this section
      alert("Time's up for this section!");
      
      // Save time spent before moving to next section
      timeSpent += sectionTimers[currentSectionIndex];
      
      if (currentSectionIndex < allSections.length - 1) {
        loadSection(currentSectionIndex + 1);
      } else {
        localStorage.setItem("testTimeTaken", timeSpent);
        finishTest();
      }
      return;
    }
    
    updateTimerDisplay(timeLeft);
  }, 1000);
}

function updateTimerDisplay(timeInSeconds) {
  const timerEl = document.getElementById("timer");
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, "0")}`;
  
  // Add warning class if less than 5 minutes remaining
  if (timeInSeconds <= 300) {
    timerEl.classList.add("timer-warning");
  } else {
    timerEl.classList.remove("timer-warning");
  }
}

function finishTest() {
  clearInterval(timerInterval);
  
  // Calculate results
  const allResults = [];
  
  // Track all questions from all sections
  const allProcessedQuestions = [];
  
  // Process each section
  allSections.forEach((section, sectionIdx) => {
    // Process questions in this section
    let questionIndexInSection = 0;
    
    section.parts.forEach((part) => {
      if (!part.questions) return;
      
      part.questions.forEach((question) => {
        questionIndexInSection++;
        
        // Find all user answers for this question
        let userAnswer = [];
        const questionKey = Object.keys(userAnswers).find(key => {
          const [testIdx, secIdx, qIdx] = key.split('_').map(Number);
          const questionInArray = allQuestions.find(q => 
            q.id === question.id && 
            q.sectionIndex === sectionIdx &&
            parseInt(secIdx) === sectionIdx
          );
          return questionInArray !== undefined;
        });
        
        if (questionKey) {
          userAnswer = userAnswers[questionKey];
        }
        
        // Get correct answer based on question type
        let correctAnswer;
        if (question.blanks && question.type === "sentence-equivalence") {
          // For sentence equivalence, the correct answers are arrays for each blank
          correctAnswer = question.blanks.map(b => b.answer);
        } else if (question.blanks) {
          // For text completion, answers are single values for each blank
          correctAnswer = question.blanks.map(b => b.answer[0]);
        } else {
          correctAnswer = question.answer || [];
        }
        
        // Determine if the answer is correct
        let isCorrect = false;
        if (question.type === "sentence-equivalence") {
          // For sentence equivalence, we need to check if the selected options match the two correct answers
          // Flatten userAnswer since it's now an array of arrays due to checkbox structure
          const flatUserAnswer = userAnswer.flat ? userAnswer.flat() : userAnswer;
          isCorrect = correctAnswer.flat().length === flatUserAnswer.length && 
            correctAnswer.flat().every(ans => flatUserAnswer.includes(ans));
        } else if (question.blanks) {
          // For text completion, all blanks must be correct
          isCorrect = correctAnswer.every((ans, i) => userAnswer[i] === ans);
        } else if (correctAnswer.length > 1) {
          // For multiple select, all options must match exactly
          isCorrect = arraysEqual(correctAnswer.sort(), userAnswer.sort());
        } else if (correctAnswer.length === 1) {
          // For single select, the one option must match
          isCorrect = userAnswer[0] === correctAnswer[0];
        }
        
        // Add this question's result
        allResults.push({
          section: sectionIdx + 1,
          questionIndex: questionIndexInSection,
          questionId: question.id,
          question: question.question,
          passage: part.passage || "",
          userAnswer: userAnswer,
          correctAnswer: correctAnswer,
          isCorrect: isCorrect
        });
        
        // Add to processed questions to avoid duplicates
        allProcessedQuestions.push(question.id);
      });
    });
  });
  
  console.log("All results:", allResults);
  
  // Save results to localStorage
  localStorage.setItem("greResult", JSON.stringify(allResults));
  
  // Redirect to results page
  window.location.href = "resultHtml.html";
}

function arraysEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  
  return true;
}

// Mark a question for review
document.getElementById("flagBtn").addEventListener("click", () => {
  const questionBtn = document.getElementById(`question-btn-${currentQuestionIndex}`);
  if (questionBtn) {
    questionBtn.classList.toggle("flagged");
  }
});

// Handle window beforeunload to warn about leaving
window.addEventListener("beforeunload", function(e) {
  const message = "Are you sure you want to leave? Your progress will be lost.";
  e.returnValue = message;
  return message;
});