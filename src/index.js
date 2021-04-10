import React from 'react';
import ReactDOM from 'react-dom';
import { Doughnut, HorizontalBar, Pie } from 'react-chartjs-2';
import { Button, Col, Input, Row, Select, Tabs, Typography } from 'antd';
import dayjs from 'dayjs';
import ChartDataLabels from 'chartjs-plugin-datalabels'; // eslint-disable-line

import { parseLog } from './logParser';
import { DatePicker } from './DatePicker';

import "antd/dist/antd.css";
import './index.css';


const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text } = Typography;


function isEmptyDict(obj) {
  return (Object.keys(obj).length === 0 && obj.constructor === Object);
}

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      data: {},
      log: "",
      logDate: dayjs(), // Now
      task_to_label: {},
      passwordInput: "",
      password: null,
      passwordIsCorrect: true,
    };
  }

  loadInitialData() {
    // NOTE: Promise for multiple fetches: https://stackoverflow.com/a/52883003/2577392
    Promise.all([
      fetch(`http://localhost:5000/api/log/${this.state.logDate.format("YYYY-MM-DD")}`, { headers: { password: this.state.password }}),
      fetch(`http://localhost:5000/api/rules/all`, { headers: { password: this.state.password }})
    ])
      .then(([res1, res2]) => {
        return Promise.all([res1.json(), res2.json()])
      })
      .then(([res1, res2]) => {
          if (isEmptyDict(res1) && isEmptyDict(res2)) {
            this.setState({
              passwordIsCorrect: false,
            });
          } else {
            this.setState({
              isLoaded: true,
              passwordIsCorrect: true,
              log: res1.log,
              data: parseLog(res1.log, res2),
              task_to_label: res2,
            });
          }
        },
        // Note: it's important to handle errors here
        // instead of a catch() block so that we don't swallow
        // exceptions from actual bugs in components.
        (error) => {
          this.setState({
            isLoaded: true,
            error
          });
        }
      )
  }

  // Similar palette to https://www.visualcapitalist.com/how-people-spend-their-time-globally/
  labelToColor(label) {
    let labelToColorDict = {
      "School and Work": "#e2cfc4",
      "Side Projects": "#f7d9c4",
      "Social Life": "#faedcb",
      "Personal Development": "#c9e4de",
      "Activities of Daily Living": "#c6def1",
      "Misc": "#dbcdf0",
      "Personal Enjoyment": "#f2c6de",
      "Sleep": "#b2b2af",
      "Unknown": "#e2e2df",
    };
    return labelToColorDict[label];
  }

  prepareSummary(data) {
    const summaryDonutOptions = {
      legend: { display: false },
      plugins: { datalabels: { render: "value", anchor: "end", align: "end", display: true } },
      layout: {
        // Padding to give space for datalabels
        padding: {
            left: 20,
            right: 20,
            top: 20,
            bottom: 20,
        }
      }
    };
    const summaryBarOptions = {
      scales: {
        xAxes: [{
          stacked: true,
          ticks: {
              min: 0,
              max: 24 * 60,
              stepSize: 60,
          },
        }],
        yAxes: [{
          stacked: true,
        }],
      },
      tooltips: {
        enabled: false,
      },
    };
    let durationSum = 0;
    let labelDurationSums = {};

    for (let i = 0; i < data.durations.length; i++) {
      const label = data.line_labels[i];
      const duration = data.durations[i];
      if (label in labelDurationSums) {
        labelDurationSums[label] += duration;
      } else {
        labelDurationSums[label] = duration;
      }
      durationSum += duration;
    }

    let summaryDonutData = { datasets: [{ data: [], backgroundColor: [], borderColor: [] }], labels: [] };
    let summaryBarData = { datasets: [], labels: ["Total"] };
    for (let [label, duration] of Object.entries(labelDurationSums)) {
      const color = this.labelToColor(label);
      summaryDonutData.datasets[0].data.push(duration);
      summaryDonutData.datasets[0].backgroundColor.push(color);
      summaryDonutData.labels.push(label);

      const dataset = { data: [duration], backgroundColor: [color], label: label };
      summaryBarData.datasets.push(dataset);
    }

    // Add empty fragment for missing log
    if (durationSum < 24 * 60) {
      summaryDonutData.datasets[0].data.push(24 * 60 - durationSum);
      summaryDonutData.datasets[0].backgroundColor.push("#ffffff");
      summaryDonutData.labels.push("");

      const dataset = { data: [24 * 60 - durationSum], backgroundColor: ["#ffffff"], label: "Unrecorded" };
      summaryBarData.datasets.push(dataset);
    }

    return [summaryDonutData, summaryDonutOptions, summaryBarData, summaryBarOptions];
  }

  prepareClocks(data) {
    const clockOptions = {
      legend: {
        display: false
      },
      plugins: {
        datalabels: {
            display: false
        }
      }
    };

    const { durations, line_labels, lines } = data;
    let amData = { datasets: [{ data: [], backgroundColor: [], borderColor: [] }], labels: [] };
    let pmData = { datasets: [{ data: [], backgroundColor: [], borderColor: [] }], labels: [] };

    let durationSum = 0;
    let isPM = false;
    let unknownLines = [];
    for (let i = 0; i < durations.length; i++) {
        const duration = durations[i];
        const line = lines[i];
        const label = line_labels[i];
        const color = this.labelToColor(label);

        durationSum += duration;
        if (!isPM && durationSum > 60 * 12) {
            isPM = true;
            const amDuration = durationSum - 60 * 12;
            const pmDuration = duration - amDuration;
            amData.datasets[0].data.push(amDuration);
            amData.datasets[0].backgroundColor.push(color);
            amData.labels.push(line);
            pmData.datasets[0].data.push(pmDuration);
            pmData.datasets[0].backgroundColor.push(color);
            pmData.labels.push(line);
            continue;
        }
        if (!isPM) {
            amData.datasets[0].data.push(duration);
            amData.datasets[0].backgroundColor.push(color);
            amData.labels.push(line);
        } else {
            pmData.datasets[0].data.push(duration);
            pmData.datasets[0].backgroundColor.push(color);
            pmData.labels.push(line);
        }

        if (label === "Unknown") {
            unknownLines.push(line);
        }
    }

    // Add empty fragment for missing log
    if (durationSum < 60 * 12) {
        amData.datasets[0].data.push(60 * 12 - durationSum);
        amData.datasets[0].backgroundColor.push("#ffffff");
        amData.labels.push("");
    } else if (durationSum < 60 * 24) {
        pmData.datasets[0].data.push(60 * 24 - durationSum);
        pmData.datasets[0].backgroundColor.push("#ffffff");
        pmData.labels.push("");
    }

    return [amData, pmData, clockOptions]
  }
 
  setLogDate(logDate, logDateString) {
    this.setState({ logDate });

    // Reload LOG textarea
    const logDateStr = logDate.format("YYYY-MM-DD");
    fetch(`http://localhost:5000/api/log/${logDateStr}`, { headers: { password: this.state.password }})
      .then((res) => res.json())
      .then(
        (result) => {
          this.setState({
            log: result.log,
            data: parseLog(result.log, this.state.task_to_label),
          })
        },
        (error) => {
          this.setState({
            error
          })
        }
      )
  }

  onLogTextareaChange(event) {
    this.setState({
      log: event.target.value,
      data: parseLog(this.state.log, this.state.task_to_label),
    });
  }

  onPreprocessTextareaChange(event) {
    this.setState({
      preprocessInput: event.target.value,
      preprocessOutput: this.preprocessLog(event.target.value),
    });
  }

  preprocessLog(preprocessInput) {
    let outputLines = [];
    let rawLines = preprocessInput.split(/\r?\n/);
    for (const rawLine of rawLines) {
      let tasks = [];
      // TODO: Separate time from task
      for (const rawTask of rawLine.split("/")) {
        const task = rawTask.trim()
                            .replace("bed", "Lie in Bed")
                            .replace("change", "Change Clothes")
                            .replace("cnp", "Change & Pack")
                            .replace("cycle", "Cycle (Cycling Machine)")
                            .replace("eat", "Eat")
                            .replace("email check", "[Email] Check")
                            .replace("email org", "[Email] Organize Starred")
                            .replace("jog", "Jog (Running Machine)")
                            .replace("log", "[LOG] Collect")
                            .replace("manga", "[Manga]")
                            .replace("net genshin cafe", "[Internet] 원신: 네이버 카페")
                            .replace("net genshin", "[Internet] 원신")
                            .replace("sports", "[Internet] Naver Sports")
                            .replace("twit org", "[Twitter] Organize Bookmarks")
                            .replace("twit", "[Twitter] Browse")
                            .replace("tv", "[TV]")
                            .replace("wtbc", "Walk to Body Cafe")
                            .replace("wth", "Walk to Home")
                            .replace(/^mu$/, "[YouTube Music]")
                            .replace(/^net$/, "[Internet]")
        tasks.push(task);
      }
      let line = tasks.join(" / ");
      outputLines.push(line);
    }

    return outputLines.join("\n");
  }

  saveLog() {
    const requestOptions = {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        "password": this.state.password,
      },
      body: JSON.stringify({ date: this.state.logDate.format("YYYY-MM-DD") , log: this.state.log })
    };
    fetch('http://localhost:5000/api/log/save', requestOptions)
      .then(res => res.json())
      .then(
        (result) => {},
        (error) => {
          console.log(error);
        }
      )
  }

  updateTaskLabel(task, task_label) {
    fetch(`http://localhost:5000/api/rules/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        "password": this.state.password,
      },
      body: JSON.stringify({ task, task_label })
    })
      .then((res) => res.json())
      .then(
        (result) => {
          if (result.status === "success") {
            let new_task_to_label = this.state.task_to_label;
            new_task_to_label[task] = task_label;
            this.setState({
              task_to_label: new_task_to_label,
              data: parseLog(this.state.log, new_task_to_label),
            })
            console.log("Success");
          }
        },
        (error) => {
          this.setState({ error })
        }
      )
  }

  // TODO: Use antd List instead
  getUnknownTasks() {
    const flat_tasks = this.state.data.tasks.flat();
    const flat_task_labels = this.state.data.task_labels.flat();

    // Sort and remove duplicate unknown tasks
    let unknown_tasks = [];
    for (let i = 0; i < flat_tasks.length; i++) {
      if (flat_task_labels[i] === "Unknown") {
        unknown_tasks.push(flat_tasks[i]);
      }
    }
    unknown_tasks.sort();
    unknown_tasks = [...new Set(unknown_tasks)];

    let elements = [];

    for (let i = 0; i < unknown_tasks.length; i++) {
      const task = unknown_tasks[i];

      // TODO: Use LABEL_PRIORITIES
      elements.push(
        <Row justify="space-between" key={task} style={{ backgroundColor: (i % 2 === 0) ? "white" : "#EEEEEE" }}>
          <Col>
            <Text>{task}</Text>
          </Col>
          <Col>
            <Select defaultValue="Unknown" onChange={(new_task_label) => this.updateTaskLabel(task, new_task_label)} style={{ width: 200 }}>
              <Option value="School and Work">School and Work</Option>
              <Option value="Side Projects">Side Projects</Option>
              <Option value="Social Life">Social Life</Option>
              <Option value="Personal Development">Personal Development</Option>
              <Option value="Activities of Daily Living">Activities of Daily Living</Option>
              <Option value="Misc">Misc</Option>
              <Option value="Personal Enjoyment">Personal Enjoyment</Option>
              <Option value="Sleep">Sleep</Option>
              <Option value="Ignore">Ignore</Option>
              <Option value="Unknown">Unknown</Option>
            </Select>
          </Col>
        </Row>
      );
    }

    return elements;
  }

  onPasswordInputChange(event) {
    this.setState({
      passwordInput: event.target.value,
    });
  }

  onPasswordSubmit() {
    this.setState({
      password: this.state.passwordInput,
    }, this.loadInitialData);
  }

  render() {
    const { error, isLoaded, data } = this.state;

    // Authentication
    if (this.state.password === null) {
      return (
        <div>
          <div className="password-container">
            <Title level={3}>Enter Password</Title>
            <Input id="password-input" onChange={(event) => this.onPasswordInputChange(event)} />
            <Button id="password-submit" type="primary" value={this.state.passwordInput} onClick={() => this.onPasswordSubmit()}>Enter</Button>
          </div>
        </div>
      );
    }
    else if (!this.state.passwordIsCorrect) {
      return (
        <div className="password-container">
          <Title level={3}>Password is incorrect!</Title>
        </div>
      )
    }

    else if (error) {
      return <div>Error: {error.message}</div>;
    } else if (!isLoaded) {
      return <div>Loading...</div>;
    } else {
      let [amData, pmData, clockOptions] = this.prepareClocks(data);
      let [summaryDonutData, summaryDonutOptions, summaryBarData, summaryBarOptions] = this.prepareSummary(data);
      return (
        <div>
          <div className="container">
            <div className="charts-container">
              <Row>
                <Col span={8}>
                  <Title level={5}>AM</Title>
                  <Pie data={amData} options={clockOptions}/>
                </Col>
                <Col span={8}>
                  <Title level={5}>PM</Title>
                  <Pie data={pmData} options={clockOptions}/>
                </Col>
                <Col span={8}>
                  <Title level={5}>Summary</Title>
                  <Doughnut data={summaryDonutData} options={summaryDonutOptions}/>
                </Col>
              </Row>
              <div className="spacing"></div>
              <Row>
                <Col span={24}>
                  <div className="summary-bar-container">
                    <HorizontalBar data={summaryBarData} options={summaryBarOptions} height={30}/>
                  </div>
                </Col>
              </Row>
            </div>

            <div className="spacing"></div>

            <Tabs defaultActiveKey="1">
              <TabPane tab="LOG" key="1">
                <div className="log-container">
                  <DatePicker value={this.state.logDate} onChange={(date, dateString) => this.setLogDate(date, dateString)} />
                  <div className="spacing-half"></div>
                  <textarea id="log" value={this.state.log} onChange={(event) => this.onLogTextareaChange(event)}></textarea>
                  <div className="spacing-half"></div>
                  <Button type="primary" onClick={this.saveLog.bind(this)}>Save LOG</Button>
                </div>
              </TabPane>
              <TabPane tab="Classifier" key="2">
                {this.getUnknownTasks()}
              </TabPane>
              <TabPane tab="Rule Examples" key="3">
                <Title level={5}>School and Work</Title>
                <ul>
                  <li>School: [Princeton]</li>
                  <li>Work: [Bloomberg]</li>
                </ul>
                <Title level={5}>Side Projects</Title>
                <ul>
                  <li>Projects: [TTrack], [Meta Learning Book], [ClipDummy]</li>
                </ul>
                <Title level={5}>Personal Development</Title>
                <ul>
                  <li>[Notion] Kanban: Update</li>
                  <li>[LOG] Collect</li>
                  <li>[Twitter] Browse</li>
                  <li>[Email] Check, Organize Starred</li>
                </ul>
                <Title level={5}>Social Life</Title>
                <ul>
                  <li>[Facebook] Browse</li>
                </ul>
                <Title level={5}>Personal Enjoyment</Title>
                <ul>
                  <li>[Game]</li>
                  <li>[YouTube]</li>
                  <li>[Internet]</li>
                </ul>
                <Title level={5}>Activities of Daily Living</Title>
                <a href="https://en.wikipedia.org/wiki/Activities_of_daily_living">Wikipedia</a>
                <ul>
                  <li>Hygiene: Shower, Bathroom, Brush Teeth</li>
                  <li>Fashion: Change Clothes, Style Hair</li>
                  <li>Food: Get Food, Eat</li>
                  <li>Moving: Walk to ?, Ride to ?</li>
                  <li>Exercise: Jog, PT</li>
                  <li>Health: Measure Weight (?), 혈압 측정 (?)</li>
                </ul>
              </TabPane>
              <TabPane tab="Preprocessor" key="4">
                <Row>
                  <Col span={12}>
                    <textarea id="preprocessInputTextarea" value={this.state.preprocessInput} onChange={(event) => this.onPreprocessTextareaChange(event)}></textarea>
                  </Col>
                  <Col span={12}>
                    <textarea id="preprocessOutputTextarea" value={this.state.preprocessOutput} disabled></textarea>
                  </Col>
                </Row>
              </TabPane>
            </Tabs>
          </div>
        </div>
      );
    }
  }
}

// ========================================

ReactDOM.render(
  <App />,
  document.getElementById('root')
);
