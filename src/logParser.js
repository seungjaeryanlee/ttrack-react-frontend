// Parse log into durations of tasks
// Copied from https://github.com/seungjaeryanlee/self-management/blob/master/task_based_parse.py
export var parseLog = function(log, task_to_label) {
    var rawLines = log.split(/\r?\n/).slice(1);
    var isPM = false;
    var durations = [];
    var lines = [];
    var line_labels = [];
    var tasks = [];
    var task_labels = [];
    var lastTimeInMinutes = 0;
    for (var rawLine of rawLines) {
        rawLine = rawLine.trim();
        if (rawLine === "~") {
            isPM = true;
            continue;
        }
        if (rawLine === "") {
            continue;
        }

        var time = rawLine.slice(0, 5).trim();
        var line = rawLine.slice(5).trim();
        var hour = parseInt(time.slice(0, -2)) + Number(isPM) * 12;
        var minute = parseInt(time.slice(-2));
        var timeInMinutes = 60 * hour + minute;
        var durationInMinutes = timeInMinutes - lastTimeInMinutes;
        var [line_label, line_tasks, line_task_labels] = classifyLine(line, task_to_label);

        durations.push(durationInMinutes);
        lines.push(line);
        line_labels.push(line_label);
        tasks.push(line_tasks);
        task_labels.push(line_task_labels);

        lastTimeInMinutes = timeInMinutes;
    }

    return { durations, lines, line_labels, tasks, task_labels };
}

export const LABEL_PRIORITIES = [
    "Unknown",
    "School and Work",
    "Personal Development",
    "Personal Well-being",
    "Misc",
    "Personal Enjoyment",
    "Ignore",
]

// Classify a single line with task-based classifiers in textarea
var classifyLine = function(line, task_to_label) {
    var tasks = line.split(" / ");
    var task_labels = [];
    for (const task of tasks) {
        if (task in task_to_label) {
            task_labels.push(task_to_label[task]);
        } else {
            task_labels.push("Unknown");
        }
    }

    let line_label = "Unknown";
    for (const label of LABEL_PRIORITIES) {
        if (task_labels.includes(label)) {
            line_label = label;
            break;
        }
    }
    if (line_label === "Ignore") { line_label = "Misc"; }

    return [ line_label, tasks, task_labels ];
}
