const sharp = require('sharp');
const { S3Client, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client(); //람다에서 실행하면 자동으로 키를 넣어줌

exports.handler = async (event, context, callback) => {
    const Bucket = event.Records[0].s3.bucket.name; //버킷 이름
    const Key = decodeURIComponent(event.Records[0].s3.object.key); //파일 이름 들어간 URL
    const filename = Key.split('/').at(-1);
    const ext = Key.split('.').at(-1);
    const requiredFormat = ext === 'jpg' ? 'jpeg' : ext; //jpg 파일이면 jpeg 로 변환
    console.log('filename: ', filename, ' ext: ', ext);

    try {
        const getObject = await s3.send(new GetObjectCommand({ Bucket, Key }));
        const buffers = [];
        for await (const data of getObject.Body){
            buffers.push(data);
        }
        const imageBuffer = Buffer.concat(buffers);
        console.log('put: ', imageBuffer.length);
        const resizedImage = await sharp(imageBuffer)
            .resize(200, 200, { fit: 'inside' })
            .toFormat(requiredFormat)
            .toBuffer();
        await s3.send(new PutObjectCommand({
            Bucket,
            Key: `thumb/${filename}`, 
            Body: resizedImage,
        }));
        console.log('put: ', resizedImage.length); //압축 파일 크기
        return callback(null, `thumb/${filename}`); //callback 호출 시 코드의 흐름이 끝났다는 것을 알려줌
    } catch (error) {
        console.error(error);
        return callback(error);
    }
}