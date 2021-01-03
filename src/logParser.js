// Parse log into durations of tasks
// Copied from https://github.com/seungjaeryanlee/self-management/blob/master/task_based_parse.py
export var parseLog = function(log) {
    var rawLines = log.split(/\r?\n/).slice(1);
    var isPM = false;
    var durations = [];
    var lines = [];
    var line_labels = [];
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
        var line_label = classifyLine(line);

        durations.push(durationInMinutes);
        lines.push(line);
        line_labels.push(line_label);

        lastTimeInMinutes = timeInMinutes;
    }

    // TODO: No tasks and task_labels
    return { durations, lines, line_labels };
}


// Classify a single line with task-based classifiers in textarea
var classifyLine = function(line) {
    var tasks = line.split(" / ");

    // TODO: Populate via backend API?
    var schoolAndWorkTasks = [];
    var personalDevelopmentTasks = [];
    var personalWellBeingTasks = [];
    var personalEnjoymentTasks = [];
    var miscTasks = ["Sleep"];
    var ignoreTasks = [];

    var hasUnknownTask = false;
    var hasSchoolAndWork = false;
    var hasPersonalDevelopment = false;
    var hasPersonalWellBeing = false;
    var hasMisc = false;
    var hasPersonalEnjoyment = false;
    var hasIgnore = false;

    for (var task of tasks) {
        if (schoolAndWorkTasks.includes(task)) {
            hasSchoolAndWork = true;
        } else if (personalDevelopmentTasks.includes(task)) {
            hasPersonalDevelopment = true;
        } else if (personalWellBeingTasks.includes(task)) {
            hasPersonalWellBeing = true;
        } else if (miscTasks.includes(task)) {
            hasMisc = true;
        } else if (personalEnjoymentTasks.includes(task)) {
            hasPersonalEnjoyment = true;
        } else if (ignoreTasks.includes(task)) {
            hasIgnore = true;
        } else {
            hasUnknownTask = true;
        }
    }

    // NOTE: Optimistic classifier
    if (hasUnknownTask) {
        return "Unknown";
    } else if (hasSchoolAndWork) {
        return "School and Work";
    } else if (hasPersonalDevelopment) {
        return "Personal Development";
    } else if (hasPersonalWellBeing) {
        return "Personal Well-being";
    } else if (hasMisc) {
        return "Misc";
    } else if (hasPersonalEnjoyment) {
        return "Personal Enjoyment";
    } else if (hasIgnore) {
        return "Misc";
    } else {
        return "Unknown";
    }
}
