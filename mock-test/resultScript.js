document.addEventListener("DOMContentLoaded", function () {
  // Try to get test data and results from localStorage
  let testData = null;
  let resultsData = null;
  let timeTaken = localStorage.getItem("testTimeTaken") || 0;

  try {
    // Fetch the test data to get question information
    fetch("json-structure.json")
      .then((response) => response.json())
      .then((data) => {
        testData = data;
        // After getting test data, load the results
        loadResults();
      })
      .catch((error) => {
        console.error("Error loading test data:", error);
        showError(
          "Failed to load test data. Please try taking the test again."
        );
      });
  } catch (e) {
    console.error("Error fetching test data:", e);
    showError(
      "Failed to initialize test results. Please try taking the test again."
    );
  }

  function loadResults() {
    try {
      // Get results from localStorage
      const resultsJson = localStorage.getItem("greResult");
      if (!resultsJson) {
        showError("No test results found. You need to complete a test first.");
        return;
      }

      resultsData = JSON.parse(resultsJson);
      if (!Array.isArray(resultsData) || resultsData.length === 0) {
        showError(
          "Invalid test results data. Please try taking the test again."
        );
        return;
      }

      // Debug logging to see the actual results data
      console.log("Loaded results data:", resultsData);

      // Process and display results
      processResults(resultsData, testData);
    } catch (e) {
      console.error("Error loading results:", e);
      showError(
        "Failed to load test results. Please try taking the test again."
      );
    }
  }

  function processResults(results, testData) {
    // Calculate overall statistics
    const totalQuestions = results.length;
    const correctAnswers = results.filter((r) => r.isCorrect).length;
    const accuracyPercentage = Math.round(
      (correctAnswers / totalQuestions) * 100
    );

    // Format time taken
    let formattedTime = "";
    if (timeTaken > 0) {
      const minutes = Math.floor(timeTaken / 60);
      const seconds = timeTaken % 60;
      formattedTime = `${minutes}m ${seconds}s`;
    } else {
      formattedTime = "N/A";
    }

    // Calculate section statistics
    const sectionResults = {};
    results.forEach((result) => {
      // Convert section to string to ensure consistent comparison
      const sectionKey = String(result.section);
      if (!sectionResults[sectionKey]) {
        sectionResults[sectionKey] = {
          total: 0,
          correct: 0,
        };
      }

      sectionResults[sectionKey].total++;
      if (result.isCorrect) {
        sectionResults[sectionKey].correct++;
      }
    });

    // Debug the section results
    console.log("Section results:", sectionResults);

    // Update score summary
    updateScoreSummary(
      totalQuestions,
      correctAnswers,
      sectionResults,
      accuracyPercentage
    );

    // Generate question cards for both sections
    generateQuestionCards(results, testData);
  }

  function updateScoreSummary(
    totalQuestions,
    correctAnswers,
    sectionResults,
    accuracyPercentage
  ) {
    // Update total score
    document.querySelector(
      ".score-box:nth-child(1) .score-value"
    ).textContent = `${correctAnswers}/${totalQuestions}`;

    // Update section scores
    let sectionIndex = 2; // Start from the second score box
    for (const section in sectionResults) {
      const sectionData = sectionResults[section];
      if (
        document.querySelector(
          `.score-box:nth-child(${sectionIndex}) .score-value`
        )
      ) {
        document.querySelector(
          `.score-box:nth-child(${sectionIndex}) .score-value`
        ).textContent = `${sectionData.correct}/${sectionData.total}`;
        sectionIndex++;
      }
    }

    // Update accuracy percentage
    document.querySelector(
      ".score-box:nth-child(4) .score-value"
    ).textContent = `${accuracyPercentage}%`;

    // Update time taken (if the element exists)
    const timeBox = document.querySelector(
      ".score-box:nth-child(5) .score-value"
    );
    if (timeBox) {
      timeBox.textContent = formattedTime;
    }
  }

  function generateQuestionCards(results, testData) {
    // Group results by section
    const resultsBySection = {};
    results.forEach((result) => {
      // Convert section to string to ensure consistent comparison
      const sectionKey = String(result.section);
      if (!resultsBySection[sectionKey]) {
        resultsBySection[sectionKey] = [];
      }
      resultsBySection[sectionKey].push(result);
    });

    console.log("Results by section:", resultsBySection);

    // Sort sections numerically
    const sectionNumbers = Object.keys(resultsBySection).sort((a, b) => {
      return parseInt(a) - parseInt(b);
    });

    // Get the section containers
    const sectionOneContainer = document.querySelector(".sectionOne");
    const sectionTwoContainer = document.querySelector(".sectionTwo");

    // Clear existing content in section containers
    if (sectionOneContainer) sectionOneContainer.innerHTML = '<h2 class="section-title">Verbal Reasoning - Section 1</h2>';
    if (sectionTwoContainer) sectionTwoContainer.innerHTML = '<h2 class="section-title">Verbal Reasoning - Section 2</h2>';

    // Process each section and add question cards to appropriate container
    sectionNumbers.forEach((sectionNum) => {
      const sectionResults = resultsBySection[sectionNum];
      // Sort questions by index within each section
      sectionResults.sort((a, b) => a.questionIndex - b.questionIndex);
      
      // Determine the correct container
      let container;
      if (sectionNum === "1") {
        container = sectionOneContainer;
      } else if (sectionNum === "2") {
        container = sectionTwoContainer;
      } else {
        console.error(`Unknown section number: ${sectionNum}`);
        return;
      }
      
      // Skip if container doesn't exist
      if (!container) {
        console.error(`Container for section ${sectionNum} not found`);
        return;
      }

      // Add question cards to the container
      sectionResults.forEach((result) => {
        const card = createQuestionCard(result, testData);
        container.appendChild(card);
      });
    });
  }

  function createQuestionCard(result, testData) {
    const card = document.createElement("div");
    card.className = "question-card";

    // Create header
    const header = document.createElement("div");
    header.className = "question-header";

    const questionNumber = document.createElement("div");
    questionNumber.className = "question-number";
    questionNumber.textContent = `Question ${result.questionIndex}`;

    const questionResult = document.createElement("div");
    questionResult.className = `question-result ${
      result.isCorrect ? "correct" : "incorrect"
    }`;
    questionResult.textContent = result.isCorrect ? "Correct" : "Incorrect";

    header.appendChild(questionNumber);
    header.appendChild(questionResult);
    card.appendChild(header);

    // Create content
    const content = document.createElement("div");
    content.className = "question-content";

    // Add passage if it exists
    if (result.passage) {
      const passage = document.createElement("div");
      passage.className = "passage";
      passage.textContent = result.passage;
      content.appendChild(passage);
    }

    // Add question text
    const questionText = document.createElement("div");
    questionText.className = "question-text";
    questionText.textContent = result.question;
    content.appendChild(questionText);

    // Add options
    const options = document.createElement("div");
    options.className = "options";

    // Find complete question data from test data
    let questionData = null;
    if (testData && testData.tests && testData.tests[0]) {
      const sections = testData.tests[0].sections;
      // Adjust for 0-based vs 1-based indexing
      const sectionIndex = parseInt(result.section) - 1;

      if (sectionIndex >= 0 && sectionIndex < sections.length) {
        const section = sections[sectionIndex];

        if (section && section.parts) {
          for (const part of section.parts) {
            if (part.questions) {
              const foundQuestion = part.questions.find(
                (q) => q.id === result.questionId
              );
              if (foundQuestion) {
                questionData = foundQuestion;
                break;
              }
            }
          }
        }
      }
    }

    // Render options based on question type
    if (questionData) {
      if (questionData.blanks) {
        // Text completion or sentence equivalence
        questionData.blanks.forEach((blank, index) => {
          const blankLabel = blank.label ? `(${blank.label}) ` : "";

          blank.options.forEach((option) => {
            const optionEl = document.createElement("div");
            optionEl.className = "option";

            // Add appropriate classes based on user's answer and correct answer
            const userSelectedThisOption =
              result.userAnswer && result.userAnswer[index] === option;
            const isCorrectOption =
              result.correctAnswer && result.correctAnswer[index] === option;

            if (userSelectedThisOption) {
              optionEl.classList.add("selected");
              if (isCorrectOption) {
                optionEl.classList.add("correct");
              } else {
                optionEl.classList.add("incorrect");
              }
            } else if (isCorrectOption) {
              optionEl.classList.add("correct");
            }

            optionEl.textContent = `${blankLabel}${option}`;
            options.appendChild(optionEl);
          });
        });
      } else if (questionData.options) {
        // Multiple choice
        questionData.options.forEach((option) => {
          const optionEl = document.createElement("div");
          optionEl.className = "option";

          // Add appropriate classes based on user's answer and correct answer
          const userSelectedThisOption =
            result.userAnswer && result.userAnswer.includes(option);
          const isCorrectOption =
            result.correctAnswer && result.correctAnswer.includes(option);

          if (userSelectedThisOption) {
            optionEl.classList.add("selected");
            if (isCorrectOption) {
              optionEl.classList.add("correct");
            } else {
              optionEl.classList.add("incorrect");
            }
          } else if (isCorrectOption) {
            optionEl.classList.add("correct");
          }

          optionEl.textContent = option;
          options.appendChild(optionEl);
        });
      }
    }

    content.appendChild(options);

    // Add answer section
    const answerSection = document.createElement("div");
    answerSection.className = "answer-section";

    // User answer
    const userAnswerDiv = document.createElement("div");
    userAnswerDiv.className = "user-answer";

    let userAnswerText;
    if (!result.userAnswer || result.userAnswer.length === 0) {
      userAnswerText = '<span class="no-answer">No answer provided</span>';
    } else {
      // Format based on question type
      if (questionData && questionData.blanks) {
        // For text completion - show each blank answer
        const formattedAnswers = [];
        questionData.blanks.forEach((blank, index) => {
          const blankLabel = blank.label ? `(${blank.label}) ` : "";
          const userAns = result.userAnswer[index] || "No answer";
          const isCorrect = result.correctAnswer[index] === userAns;
          formattedAnswers.push(
            `${blankLabel}<span class="${
              isCorrect ? "correct" : "incorrect"
            }">${userAns}</span>`
          );
        });
        userAnswerText = formattedAnswers.join(", ");
      } else {
        // For multiple choice
        userAnswerText = `<span class="${
          result.isCorrect ? "correct" : "incorrect"
        }">${result.userAnswer.join(", ")}</span>`;
      }
    }

    userAnswerDiv.innerHTML = `Your answer: ${userAnswerText}`;
    answerSection.appendChild(userAnswerDiv);

    // Correct answer
    const correctAnswerDiv = document.createElement("div");
    correctAnswerDiv.className = "correct-answer";

    let correctAnswerText;
    if (questionData && questionData.blanks) {
      // For text completion - show each blank answer
      const formattedAnswers = [];
      questionData.blanks.forEach((blank, index) => {
        const blankLabel = blank.label ? `(${blank.label}) ` : "";
        formattedAnswers.push(
          `${blankLabel}<span class="correct">${result.correctAnswer[index]}</span>`
        );
      });
      correctAnswerText = formattedAnswers.join(", ");
    } else {
      // For multiple choice
      correctAnswerText = `<span class="correct">${result.correctAnswer.join(
        ", "
      )}</span>`;
    }

    correctAnswerDiv.innerHTML = `Correct answer: ${correctAnswerText}`;
    answerSection.appendChild(correctAnswerDiv);

    // Add explanation if available
    if (questionData && questionData.explanation) {
      const explanationDiv = document.createElement("div");
      explanationDiv.className = "explanation";
      explanationDiv.innerHTML = `<h4>Explanation:</h4><p>${questionData.explanation}</p>`;
      content.appendChild(explanationDiv);
    } else {
      // Generate a simple explanation
      const explanationDiv = document.createElement("div");
      explanationDiv.className = "explanation";

      let explanationText = "";
      if (result.isCorrect) {
        explanationText = "Correct! You selected the right answer.";
      } else if (!result.userAnswer || result.userAnswer.length === 0) {
        explanationText = "You did not provide an answer to this question.";
      } else {
        if (questionData && questionData.blanks) {
          explanationText =
            "The selected answer does not correctly complete the sentence in context.";
        } else {
          explanationText =
            "The selected answer is not the best choice based on the given information.";
        }
      }

      explanationDiv.innerHTML = `<h4>Explanation:</h4><p>${explanationText}</p>`;
      content.appendChild(explanationDiv);
    }

    // Finally add the content to the card
    card.appendChild(content);

    // Add answer section to content
    content.appendChild(answerSection);

    return card;
  }

  function showError(message) {
    const container = document.querySelector(".container");
    const errorDiv = document.createElement("div");
    errorDiv.className = "error";
    errorDiv.textContent = message;

    // Clear existing content except for the title
    const title = container.querySelector("h1");
    container.innerHTML = "";
    container.appendChild(title);
    container.appendChild(errorDiv);
  }

  // Add function to export results or retry test
  document
    .getElementById("exportResults")
    ?.addEventListener("click", function () {
      window.print();
    });

  document.getElementById("retryTest")?.addEventListener("click", function () {
    window.location.href = "testIndex.html";
  });
});