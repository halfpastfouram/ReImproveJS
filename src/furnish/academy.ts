import {Agent, LearningConfig, AgentConfig, TrackingInformation} from "./agent";
import {Teacher, TeachingConfig} from "./teacher";
import {v4} from 'uuid';
import {Model} from "./model";
import {LearningDataLogger} from "./misc/learning_data_logger";

/*const DEFAULT_ACADEMY_CONFIG: AcademyConfig = {
};

export interface AcademyConfig {
}*/

export interface AcademyStepInput {
    teacherName: string;
    agentsInput: number[];
}

export interface BuildAgentConfig {
    model: Model;
    learningConfig?: LearningConfig;
    agentConfig?: AgentConfig;
}

export class Academy {

    // private config: AcademyConfig;
    private agents: Map<string, Agent>;
    private teachers: Map<string, Teacher>;
    private assigments: Map<string, string>;

    private logger: LearningDataLogger;

    constructor(/*config?: AcademyConfig*/) {
        //this.config = {...DEFAULT_ACADEMY_CONFIG, ...config};
        this.agents = new Map<string, Agent>();
        this.teachers = new Map<string, Teacher>();
        this.assigments = new Map<string, string>();
    }

    addAgent(config: BuildAgentConfig, name?: string): string {
        if(name && config.agentConfig && !config.agentConfig.name)
            config.agentConfig.name = name;

        let agent = new Agent(config.model, config.agentConfig, config.learningConfig);
        if(!agent.Name)
            if(name && !this.agents.has(name))
                agent.Name = name;
            else
                agent.Name = v4();

        this.agents.set(agent.Name, agent);

        return agent.Name;
    }

    addTeacher(config?: TeachingConfig, name?: string): string {
        let teacher = new Teacher(config, name);
        if(!teacher.Name)
            if(name && !this.teachers.has(name))
                teacher.Name = name;
            else
                teacher.Name = v4();

        this.teachers.set(teacher.Name, teacher);

        return teacher.Name;
    }

    assignTeacherToAgent(agentName: string, teacherName: string) {
        if(!this.agents.has(agentName))
            throw new Error("No such agent has been registered");
        if(!this.teachers.has(teacherName))
            throw new Error("No such teacher has been registered");

        this.assigments.set(agentName, teacherName);
        this.teachers.get(teacherName).affectStudent(this.agents.get(agentName));
    }

    async step(inputs: AcademyStepInput[] | AcademyStepInput): Promise<Map<string, number>> {
        let actions = new Map<string, number>();
        let finalInput = inputs instanceof Array ? inputs : [inputs];
        finalInput.forEach(input => {
            if(!this.teachers.has(input.teacherName)) {
                console.error("No teacher has name " + input.teacherName);
                return;
            }

            this.teachers.get(input.teacherName).teach(input.agentsInput).forEach((value, key) => {
                if(actions.has(key))
                    throw new Error("Agent " + key + " has already registered an action.");

                actions.set(key, value);
            });
        });

        if(this.logger)
            this.logger.updateTables();

        return actions;
    }

    addRewardToAgent(name: string, reward: number) {
        if(this.agents.has(name))
            this.agents.get(name).addReward(reward);
    }

    setRewardOfAgent(name: string, reward: number) {
        if(this.agents.has(name))
            this.agents.get(name).setReward(reward);
    }

    OnLearningLessonEnded(teacherName: string, callback: (teacher: Teacher) => void) {
        if(this.teachers.has(teacherName))
            this.teachers.get(teacherName).onLearningLessonEnded = callback;
    }

    OnLessonEnded(teacherName: string, callback: (teacher: Teacher, lessonNumber: number) => void) {
        if(this.teachers.has(teacherName))
            this.teachers.get(teacherName).onLessonEnded = callback;
    }

    OnTeachingEnded(teacherName: string, callback: (teacher: Teacher) => void) {
        if(this.teachers.has(teacherName))
            this.teachers.get(teacherName).onTeachingEnded = callback;
    }

    reset() {
        this.teachers.clear();
        this.agents.clear();
    }

    get Teachers() { return Array.from(this.teachers.keys()); }

    getTeacherData(name: string): TrackingInformation[] {
        return this.teachers.get(name).getData();
    }

    createLogger(parent: HTMLElement): void {
        if(this.logger) this.logger.dispose();
        this.logger = new LearningDataLogger(parent, this);
    }
}